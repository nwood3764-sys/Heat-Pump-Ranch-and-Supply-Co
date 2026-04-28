/**
 * ACiQ scraper.
 *
 * Primary public source: HVACDirect.com (server-rendered Magento, no auth,
 * complete spec data + PDFs + retail/MSRP pricing).
 *
 * Future extension: when ACIQ_PORTAL_USERNAME / ACIQ_PORTAL_PASSWORD are
 * set in env, augment with wholesale pricing scraped from portal.aciq.com.
 * For now the public path delivers everything needed to populate the
 * catalog with retail pricing and MSRP.
 *
 * Run modes:
 *   node sync-aciq.mjs                  — full sync, requires Supabase env
 *   node sync-aciq.mjs --dry-run        — scrape only, prints JSON, no DB
 *   node sync-aciq.mjs --dry-run --limit=10  — first N products only
 *   node sync-aciq.mjs --category=aciq-mini-split-systems  — single category
 *
 * Required env for non-dry-run:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { runSync } from "./sync-runner.mjs";
import {
  HVACDIRECT_BASE,
  walkCategory,
  fetchProductDetail,
  mapBreadcrumbsToCategory,
  parseModelLine,
} from "./lib/hvacdirect.mjs";

// Known ACiQ subcategories on HVACDirect. Listed explicitly so the scraper
// has a stable set even if the brand index page restructures. The walker
// auto-paginates within each. Some of these may 404 — the scraper logs and
// moves on rather than failing the whole run.
const ACIQ_CATEGORIES = [
  "/brands/aciq-heating-cooling/aciq-heat-pumps.html",
  "/brands/aciq-heating-cooling/aciq-mini-split-systems.html",
  "/brands/aciq-heating-cooling/aciq-air-conditioners.html",
  "/brands/aciq-heating-cooling/aciq-furnaces.html",
  "/brands/aciq-heating-cooling/aciq-unitary/aciq-air-handlers.html",
  "/brands/aciq-heating-cooling/aciq-unitary/aciq-ac-coil-systems.html",
  "/brands/aciq-heating-cooling/aciq-unitary/aciq-furnace-and-ac-systems.html",
  "/brands/aciq-heating-cooling/aciq-unitary/aciq-heat-pump-systems.html",
  "/brands/aciq-heating-cooling/aciq-mobile-home-ac.html",
  "/brands/aciq-heating-cooling/aciq-pool-heat-pumps.html",
  "/brands/aciq-heating-cooling/aciq-thermostats.html",
  "/brands/aciq-heating-cooling/aciq-accessories.html",
  "/brands/aciq-heating-cooling/aciq-parts.html",
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
const categoryArg = args.find((a) => a.startsWith("--category="));
const singleCategory = categoryArg ? categoryArg.split("=")[1] : null;

const log = (...m) => console.error("[aciq]", ...m);

async function scrape() {
  // Determine which category URLs to walk
  let categoryPaths = ACIQ_CATEGORIES;
  if (singleCategory) {
    categoryPaths = ACIQ_CATEGORIES.filter((p) => p.includes(singleCategory));
    if (categoryPaths.length === 0) {
      log(`category filter "${singleCategory}" matched nothing — using all`);
      categoryPaths = ACIQ_CATEGORIES;
    }
  }

  // 1) Walk every category, collect listing-level entries (deduped by sourceId)
  const seen = new Map();
  for (const path of categoryPaths) {
    const url = `${HVACDIRECT_BASE}${path}`;
    log(`walking ${path}`);
    let entries;
    try {
      entries = await walkCategory(url, { log: (m) => log(m) });
    } catch (err) {
      log(`  failed to walk ${path}:`, err?.message ?? err);
      continue;
    }
    log(`  -> ${entries.length} entries`);
    for (const e of entries) {
      if (!seen.has(e.sourceId)) seen.set(e.sourceId, e);
    }
  }
  log(`total unique listing entries: ${seen.size}`);

  // 2) For each entry, fetch detail page to enrich with specs, docs, etc.
  const entries = [...seen.values()];
  const toEnrich = limit ? entries.slice(0, limit) : entries;
  if (limit) log(`--limit=${limit}: enriching ${toEnrich.length} of ${entries.length}`);

  const products = [];
  let i = 0;
  for (const e of toEnrich) {
    i++;
    if (!e.url) continue;
    try {
      const detail = await fetchProductDetail(e.url);
      const { primarySku, allSkus } = parseModelLine(e.modelLine || detail.skuValue);
      if (!primarySku) {
        log(`  ${i}/${toEnrich.length} skip (no SKU): ${e.title}`);
        continue;
      }
      // Reject non-SKU strings. HVACDirect's "Design Your Own" configurator
      // pages have no Model line and Magento's SKU field on those is a
      // human label like "ACIQ Dual Zone R454B" — not a real model number.
      // Real ACiQ SKUs are uppercase alphanumerics + dashes/dots, no spaces.
      // Configurator/system listings belong in system_packages, not products.
      if (!isLikelyRealSku(primarySku)) {
        log(`  ${i}/${toEnrich.length} skip (configurator/non-SKU "${primarySku}"): ${e.title}`);
        continue;
      }

      const categorySlug = mapBreadcrumbsToCategory(detail.breadcrumbs);

      // Build spec object: merge listing pricing context + detail spec table
      const specs = {
        ...detail.specs,
        all_skus: allSkus,
        hvacdirect_breadcrumbs: detail.breadcrumbs,
      };

      // Pricing: HVACDirect's "Special Price" is the public retail.
      // "Was" (oldPrice) is treated as MSRP for the strikethrough.
      const pricing = {
        retail: e.salePrice ?? e.oldPrice ?? null,
        msrp: e.oldPrice ?? null,
      };

      // Determine product_type from category mapping
      let productType = "equipment";
      if (categorySlug === null && detail.breadcrumbs.some((b) => /accessor/i.test(b))) {
        productType = "accessory";
      } else if (categorySlug === null && detail.breadcrumbs.some((b) => /\bparts?\b/i.test(b))) {
        productType = "part";
      }

      const imageUrls = [];
      if (e.thumbnailUrl) imageUrls.push(e.thumbnailUrl);
      if (detail.ogImage && detail.ogImage !== e.thumbnailUrl) imageUrls.push(detail.ogImage);

      products.push({
        sourceId: e.sourceId, // HVACDirect Magento numeric id
        sku: primarySku,
        brand: "ACiQ",
        title: e.title || detail.titleH1,
        modelNumber: primarySku,
        shortDescription: null,
        description: detail.description,
        categorySlug,
        productType,
        specs,
        sourceUrl: e.url,
        imageUrls,
        documents: detail.documents,
        pricing,
      });

      if (i % 25 === 0) log(`  enriched ${i}/${toEnrich.length}`);
      // Polite throttle between detail pages
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      log(`  ${i}/${toEnrich.length} failed: ${e.url}`, err?.message ?? err);
    }
  }

  log(`scrape complete: ${products.length} products before dedup`);

  // HVACDirect lists the same physical model under multiple sourceIds —
  // e.g. "with 16 ft line set", "with 25 ft line set", "no line set"
  // are 3 separate product pages but all share the same Model: line and
  // therefore the same SKU. Without dedup, the runner inserts the first
  // and the rest fail on the products.sku unique constraint. Merge
  // documents and image URLs from all duplicates into the representative
  // chosen by document count (proxy for how complete the listing is).
  const bySku = new Map();
  for (const p of products) {
    const existing = bySku.get(p.sku);
    if (!existing) {
      bySku.set(p.sku, p);
      continue;
    }
    const score = (x) =>
      (x.documents?.length ?? 0) * 100 + Object.keys(x.specs ?? {}).length;
    const winner = score(p) > score(existing) ? p : existing;
    const loser = winner === p ? existing : p;
    const docUrls = new Set(winner.documents.map((d) => d.url));
    for (const d of loser.documents) {
      if (!docUrls.has(d.url)) {
        winner.documents.push(d);
        docUrls.add(d.url);
      }
    }
    const imgUrls = new Set(winner.imageUrls);
    for (const u of loser.imageUrls) {
      if (!imgUrls.has(u)) {
        winner.imageUrls.push(u);
        imgUrls.add(u);
      }
    }
    bySku.set(p.sku, winner);
  }
  const deduped = [...bySku.values()];
  if (deduped.length !== products.length) {
    log(`dedup: ${products.length} -> ${deduped.length} unique SKUs`);
  }

  return { products: deduped };
}

/**
 * SKU shape check. Real ACiQ model numbers are like ACIQ-09Z-HP115C,
 * SCC-0612-HH-MB, MSC-09KH-1, etc. — uppercase letters/digits with
 * dashes, dots, slashes; no spaces; 3–40 chars. Anything outside this
 * shape (e.g. "ACIQ Dual Zone R454B") is a configurator label, not a
 * SKU, and should be skipped.
 */
function isLikelyRealSku(sku) {
  if (typeof sku !== "string") return false;
  return /^[A-Z0-9][A-Z0-9./_-]{2,40}$/i.test(sku) && !/\s/.test(sku);
}

if (dryRun) {
  log("DRY RUN — no DB writes");
  const { products } = await scrape();
  console.log(JSON.stringify({ count: products.length, products }, null, 2));
  process.exit(0);
}

await runSync({ portal: "aciq", scrape });
