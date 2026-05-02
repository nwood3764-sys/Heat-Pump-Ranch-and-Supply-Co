/**
 * ACiQ scraper.
 *
 * TWO-PASS DESIGN
 *
 *   PASS 1 — public hvacdirect.com (no auth)
 *     Always runs. Walks the brand's public subcategory pages and
 *     enriches each listing with the spec table, description, PDFs,
 *     retail/MSRP pricing, and breadcrumb-derived category.
 *
 *   PASS 2 — portal.aciq.com (Magento dealer login, optional)
 *     Runs when ACIQ_PORTAL_USERNAME / ACIQ_PORTAL_PASSWORD are set.
 *     Authenticates against the dealer portal, walks every category
 *     it discovers, and folds those products into the result by SKU.
 *     Portal entries override public ones for fields that the portal
 *     knows better (wholesale pricing, dealer-only SKUs, current
 *     availability).
 *
 * GLOBAL FILTERS (applied to the merged set)
 *   - Drop products whose detected refrigerant is R-410A (legacy,
 *     phased out in residential heat-pump/AC equipment 2025+).
 *   - Drop products with discontinued/obsolete markers in the title
 *     or specs.
 *
 * Run modes:
 *   node sync-aciq.mjs                 — full sync, requires Supabase env
 *   node sync-aciq.mjs --dry-run       — scrape + filter, prints JSON, no DB
 *   node sync-aciq.mjs --dry-run --limit=10
 *   node sync-aciq.mjs --skip-portal   — public pass only (debug)
 *   node sync-aciq.mjs --portal-only   — portal pass only (debug)
 *
 * Required env for non-dry-run:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   ACIQ_PORTAL_USERNAME / ACIQ_PORTAL_PASSWORD
 */

import { runSync } from "./sync-runner.mjs";
import {
  HVACDIRECT_BASE,
  walkCategory,
  fetchProductDetail,
  mapBreadcrumbsToCategory,
  parseModelLine,
} from "./lib/hvacdirect.mjs";
import {
  loginToAciqPortal,
  discoverPortalCategories,
  walkPortalListing,
  fetchPortalProductDetail,
  ACIQ_PORTAL_BASE,
} from "./lib/aciq-portal.mjs";
import {
  detectRefrigerant,
  shouldExcludeAciq,
  stampRefrigerant,
} from "./lib/refrigerant.mjs";
import { parallelMap } from "./lib/concurrent.mjs";

const DETAIL_CONCURRENCY = Number(process.env.SCRAPER_CONCURRENCY) || 6;

// HVACDirect ACiQ subcategory URLs. Confirmed live via the previous
// run's logs; 404 paths have been removed to keep the run quiet. The
// brand index page itself returns 0 listings (different DOM than the
// subcategory pages) so it's not included.
const ACIQ_HVACDIRECT_CATEGORIES = [
  "/brands/aciq-heating-cooling/aciq-heat-pumps.html",
  "/brands/aciq-heating-cooling/aciq-mini-split-systems.html",
  "/brands/aciq-heating-cooling/aciq-unitary/aciq-heat-pump-systems.html",
  "/brands/aciq-heating-cooling/aciq-mobile-home-ac.html",
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipPortal = args.includes("--skip-portal");
const portalOnly = args.includes("--portal-only");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
const categoryArg = args.find((a) => a.startsWith("--category="));
const singleCategory = categoryArg ? categoryArg.split("=")[1] : null;

const log = (...m) => console.error("[aciq]", ...m);

function isLikelyRealSku(sku) {
  if (typeof sku !== "string") return false;
  return /^[A-Z0-9][A-Z0-9./_-]{2,40}$/i.test(sku) && !/\s/.test(sku);
}

async function scrapeHvacdirect() {
  let categoryPaths = ACIQ_HVACDIRECT_CATEGORIES;
  if (singleCategory) {
    const filtered = ACIQ_HVACDIRECT_CATEGORIES.filter((p) => p.includes(singleCategory));
    if (filtered.length > 0) categoryPaths = filtered;
    else log(`category filter "${singleCategory}" matched nothing — using all`);
  }

  const seen = new Map();
  for (const path of categoryPaths) {
    const url = `${HVACDIRECT_BASE}${path}`;
    log(`hvacdirect: walking ${path}`);
    let entries;
    try {
      entries = await walkCategory(url, { log: (m) => log(m) });
    } catch (err) {
      log(`  hvacdirect: failed to walk ${path}: ${err?.message ?? err}`);
      continue;
    }
    log(`  hvacdirect: ${entries.length} entries`);
    for (const e of entries) {
      if (!seen.has(e.sourceId)) seen.set(e.sourceId, { ...e, from: "hvacdirect" });
    }
  }
  log(`hvacdirect: ${seen.size} unique listing entries`);
  return [...seen.values()];
}

/**
 * Enrich a listing entry into a full ScrapedProduct. The detail fetch
 * function is portal-specific (cookied vs anonymous) so it's injected.
 */
async function enrichEntry(entry, getDetail) {
  if (!entry.url) return null;
  const detail = await getDetail(entry.url);
  const { primarySku, allSkus } = parseModelLine(entry.modelLine || detail.skuValue);
  if (!primarySku) {
    log(`  skip (no SKU): ${entry.title}`);
    return null;
  }
  if (!isLikelyRealSku(primarySku)) {
    log(`  skip (configurator/non-SKU "${primarySku}"): ${entry.title}`);
    return null;
  }
  const categorySlug = mapBreadcrumbsToCategory(detail.breadcrumbs);

  const specs = {
    ...detail.specs,
    all_skus: allSkus,
    hvacdirect_breadcrumbs: detail.breadcrumbs,
    source_origin: entry.from ?? "hvacdirect",
  };

  const pricing = {
    retail: entry.salePrice ?? entry.oldPrice ?? null,
    msrp: entry.oldPrice ?? null,
  };

  let productType = "equipment";
  if (categorySlug === null && detail.breadcrumbs.some((b) => /accessor/i.test(b))) {
    productType = "accessory";
  } else if (categorySlug === null && detail.breadcrumbs.some((b) => /\bparts?\b/i.test(b))) {
    productType = "part";
  }

  const imageUrls = [];
  if (entry.thumbnailUrl) imageUrls.push(entry.thumbnailUrl);
  if (detail.ogImage && detail.ogImage !== entry.thumbnailUrl) imageUrls.push(detail.ogImage);

  return {
    sourceId: entry.sourceId,
    sku: primarySku,
    brand: "ACiQ",
    title: entry.title || detail.titleH1,
    modelNumber: primarySku,
    shortDescription: null,
    description: detail.description,
    categorySlug,
    productType,
    specs,
    sourceUrl: entry.url,
    imageUrls,
    documents: detail.documents,
    pricing,
  };
}

async function enrichBatch(entries, getDetail, { source }) {
  const cap = limit ? entries.slice(0, limit) : entries;
  if (limit) log(`${source}: --limit=${limit}: enriching ${cap.length} of ${entries.length}`);

  let done = 0;
  const t0 = Date.now();
  // Parallel detail fetches with bounded concurrency. Six in flight is
  // a good balance for a single Magento origin — fast enough to complete
  // ~1000 products in under a minute, slow enough that we don't get
  // rate-limited.
  const results = await parallelMap(cap, async (e) => {
    const product = await enrichEntry(e, getDetail);
    done++;
    if (done % 50 === 0) {
      const rps = (done / ((Date.now() - t0) / 1000)).toFixed(1);
      log(`  ${source}: enriched ${done}/${cap.length} (${rps}/s)`);
    }
    return product;
  }, DETAIL_CONCURRENCY);

  const products = [];
  let failed = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.ok) {
      failed++;
      log(`  ${source}: ${i + 1}/${cap.length} failed: ${cap[i].url} — ${r.error?.message ?? r.error}`);
      continue;
    }
    if (r.value) products.push(r.value);
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  log(`  ${source}: enriched ${products.length} in ${elapsed}s (${failed} failed)`);
  return products;
}

/**
 * Merge two product lists by SKU. Portal entries take precedence on
 * fields the portal knows better (pricing, source_url, sourceId), but
 * we union documents and image URLs so both feeds contribute media.
 */
function mergeBySku(public_, portal) {
  const map = new Map();
  for (const p of public_) map.set(p.sku, p);
  for (const p of portal) {
    const existing = map.get(p.sku);
    if (!existing) {
      map.set(p.sku, p);
      continue;
    }
    const merged = { ...existing };
    // Portal pricing wins
    if (p.pricing && (p.pricing.retail != null || p.pricing.msrp != null)) {
      merged.pricing = { ...existing.pricing, ...p.pricing };
    }
    // Portal sourceId/url override (so reconciliation tracks the dealer
    // portal entry as canonical going forward)
    merged.sourceId = p.sourceId;
    merged.sourceUrl = p.sourceUrl;
    // Union docs + images
    const docUrls = new Set((existing.documents ?? []).map((d) => d.url));
    merged.documents = [...(existing.documents ?? [])];
    for (const d of p.documents ?? []) {
      if (!docUrls.has(d.url)) {
        merged.documents.push(d);
        docUrls.add(d.url);
      }
    }
    const imgUrls = new Set(existing.imageUrls ?? []);
    merged.imageUrls = [...(existing.imageUrls ?? [])];
    for (const u of p.imageUrls ?? []) {
      if (!imgUrls.has(u)) {
        merged.imageUrls.push(u);
        imgUrls.add(u);
      }
    }
    // Specs: portal wins on overlap (more current), public fills gaps
    merged.specs = { ...(existing.specs ?? {}), ...(p.specs ?? {}) };
    map.set(p.sku, merged);
  }
  return [...map.values()];
}

async function scrape() {
  let publicProducts = [];
  let portalProducts = [];

  if (!portalOnly) {
    const publicEntries = await scrapeHvacdirect();
    publicProducts = await enrichBatch(publicEntries, fetchProductDetail, {
      source: "hvacdirect",
    });
    log(`hvacdirect: ${publicProducts.length} enriched products`);
  }

  if (!skipPortal && process.env.ACIQ_PORTAL_USERNAME && process.env.ACIQ_PORTAL_PASSWORD) {
    log("portal: starting authenticated pass against portal.aciq.com");
    try {
      const { jar, entries } = await scrapePortalEntries();
      const detailFetcher = (url) => fetchPortalProductDetail(jar, url);
      portalProducts = await enrichBatch(entries, detailFetcher, { source: "portal" });
      log(`portal: ${portalProducts.length} enriched products`);
    } catch (err) {
      log(`portal: pass failed (${err?.message ?? err}) — continuing with public only`);
    }
  } else if (!skipPortal) {
    log("portal: ACIQ_PORTAL_USERNAME/PASSWORD not set, skipping authenticated pass");
  }

  // Merge by SKU (case-insensitive collapse happens later in the DB
  // via the citext unique index + ON CONFLICT upsert)
  let merged = mergeBySku(publicProducts, portalProducts);
  log(`merged: ${merged.length} products before filter`);

  // Refrigerant + discontinued filter
  let dropped = 0;
  let r410a = 0;
  const kept = [];
  for (const p of merged) {
    const r = detectRefrigerant(p);
    if (r === "R-410A") r410a++;
    if (shouldExcludeAciq(p)) {
      dropped++;
      continue;
    }
    kept.push(stampRefrigerant(p));
  }
  log(`filtered: kept ${kept.length}, dropped ${dropped} (incl ${r410a} R-410A)`);

  return { products: kept };
}

/**
 * Helper that returns both the live cookie jar and the discovered
 * listing entries from the portal. Detail fetches need the jar.
 */
async function scrapePortalEntries() {
  const u = process.env.ACIQ_PORTAL_USERNAME;
  const p = process.env.ACIQ_PORTAL_PASSWORD;
  const jar = await loginToAciqPortal(u, p, { log: (m) => log(m) });
  const cats = await discoverPortalCategories(jar, { log: (m) => log(m) });
  log(`portal: discovered ${cats.length} category URLs`);
  const start = cats.length > 0 ? cats : [`${ACIQ_PORTAL_BASE}/`];
  const seen = new Map();
  for (const url of start) {
    let entries;
    try {
      entries = await walkPortalListing(jar, url, { log: (m) => log(m) });
    } catch (err) {
      log(`portal: walk ${url} failed: ${err?.message ?? err}`);
      continue;
    }
    for (const e of entries) {
      if (!seen.has(e.sourceId)) seen.set(e.sourceId, e);
    }
  }
  log(`portal: ${seen.size} unique entries`);
  return { jar, entries: [...seen.values()] };
}

if (dryRun) {
  log("DRY RUN — no DB writes");
  const { products } = await scrape();
  console.log(JSON.stringify({ count: products.length, products }, null, 2));
  process.exit(0);
}

await runSync({ portal: "aciq", scrape });
