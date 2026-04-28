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
 *   node sync-aciq.mjs                  â full sync, requires Supabase env
 *   node sync-aciq.mjs --dry-run        â scrape only, prints JSON, no DB
 *   node sync-aciq.mjs --dry-run --limit=10  â first N products only
 *   node sync-aciq.mjs --category=aciq-mini-split-systems  â single category
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
// auto-paginates within each. Some of these may 404 â the scraper logs and
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
      log(`category filter "${singleCategory}" matched nothing â using all`);
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

  log(`scrape complete: ${products.length} products`);
  return { products };
}

if (dryRun) {
  log("DRY RUN â no DB writes");
  const { products } = await scrape();
  console.log(JSON.stringify({ count: products.length, products }, null, 2));
  process.exit(0);
}

await runSync({ portal: "aciq", scrape });
