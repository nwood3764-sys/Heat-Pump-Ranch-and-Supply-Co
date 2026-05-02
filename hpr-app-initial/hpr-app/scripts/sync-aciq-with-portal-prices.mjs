/**
 * ACiQ sync with pre-scraped portal pricing.
 *
 * This script runs the normal HVAC Direct public pass to get product details,
 * then overlays dealer pricing from a pre-scraped portal JSON file (generated
 * by the browser-assisted portal scrape).
 *
 * Usage:
 *   node sync-aciq-with-portal-prices.mjs --portal-prices=/path/to/aciq-portal-prices.json
 *   node sync-aciq-with-portal-prices.mjs --portal-prices=/path/to/prices.json --limit=20
 *   node sync-aciq-with-portal-prices.mjs --portal-prices=/path/to/prices.json --dry-run
 */

import { readFileSync } from "fs";
import { runSync } from "./sync-runner.mjs";
import {
  HVACDIRECT_BASE,
  walkCategory,
  fetchProductDetail,
  mapBreadcrumbsToCategory,
  parseModelLine,
} from "./lib/hvacdirect.mjs";
import {
  detectRefrigerant,
  shouldExcludeAciq,
  stampRefrigerant,
} from "./lib/refrigerant.mjs";
import { parallelMap } from "./lib/concurrent.mjs";

const DETAIL_CONCURRENCY = Number(process.env.SCRAPER_CONCURRENCY) || 6;

const ACIQ_HVACDIRECT_CATEGORIES = [
  "/brands/aciq-heating-cooling/aciq-heat-pumps.html",
  "/brands/aciq-heating-cooling/aciq-mini-split-systems.html",
  "/brands/aciq-heating-cooling/aciq-unitary/aciq-heat-pump-systems.html",
  "/brands/aciq-heating-cooling/aciq-mobile-home-ac.html",
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
const portalPricesArg = args.find((a) => a.startsWith("--portal-prices="));
const portalPricesPath = portalPricesArg
  ? portalPricesArg.split("=")[1]
  : "/home/ubuntu/aciq-portal-prices.json";

const log = (...m) => console.error("[aciq]", ...m);

// Load portal prices
log(`Loading portal prices from: ${portalPricesPath}`);
const portalPricesRaw = JSON.parse(readFileSync(portalPricesPath, "utf-8"));
// Build lookup map: model (uppercase) -> dealer price
const portalPriceMap = new Map();
for (const p of portalPricesRaw) {
  portalPriceMap.set(p.model.toUpperCase(), p.dealerPrice);
}
log(`Loaded ${portalPriceMap.size} portal prices`);

function isLikelyRealSku(sku) {
  if (typeof sku !== "string") return false;
  return /^[A-Z0-9][A-Z0-9./_-]{2,40}$/i.test(sku) && !/\s/.test(sku);
}

async function scrapeHvacdirect() {
  const seen = new Map();
  for (const path of ACIQ_HVACDIRECT_CATEGORIES) {
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

async function enrichEntry(entry) {
  if (!entry.url) return null;
  const detail = await fetchProductDetail(entry.url);
  const { primarySku, allSkus } = parseModelLine(entry.modelLine || detail.skuValue);
  if (!primarySku) return null;
  if (!isLikelyRealSku(primarySku)) return null;

  const categorySlug = mapBreadcrumbsToCategory(detail.breadcrumbs);
  const specs = {
    ...detail.specs,
    all_skus: allSkus,
    hvacdirect_breadcrumbs: detail.breadcrumbs,
    source_origin: "hvacdirect",
  };

  // HVAC Direct internet list price (for strikethrough)
  const hvacDirectPrice = entry.oldPrice ?? entry.salePrice ?? null;

  // Look up dealer price from portal data
  // Try matching by primary SKU and all alternative SKUs
  let dealerPrice = portalPriceMap.get(primarySku.toUpperCase());
  if (dealerPrice == null && allSkus) {
    for (const altSku of allSkus) {
      dealerPrice = portalPriceMap.get(altSku.toUpperCase());
      if (dealerPrice != null) break;
    }
  }

  // Also try without trailing suffixes (portal models sometimes differ slightly)
  if (dealerPrice == null) {
    // Try removing common suffixes like -FREE, -?"
    const baseSku = primarySku.replace(/-FREE$/i, "").replace(/-?\d+$/, "");
    dealerPrice = portalPriceMap.get(baseSku.toUpperCase());
  }

  const pricing = {
    // If we have portal dealer price, use it; otherwise fall back to HVAC Direct retail
    dealer: dealerPrice ?? null,
    retail: dealerPrice == null ? (entry.salePrice ?? null) : null,
    msrp: hvacDirectPrice,
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

async function scrape() {
  const entries = await scrapeHvacdirect();
  const cap = limit ? entries.slice(0, limit) : entries;
  if (limit) log(`--limit=${limit}: enriching ${cap.length} of ${entries.length}`);

  let done = 0;
  const t0 = Date.now();
  const results = await parallelMap(
    cap,
    async (e) => {
      const product = await enrichEntry(e);
      done++;
      if (done % 50 === 0) {
        const rps = (done / ((Date.now() - t0) / 1000)).toFixed(1);
        log(`  enriched ${done}/${cap.length} (${rps}/s)`);
      }
      return product;
    },
    DETAIL_CONCURRENCY,
  );

  const products = [];
  let failed = 0;
  let withDealerPrice = 0;
  let withoutDealerPrice = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.ok) {
      failed++;
      continue;
    }
    if (!r.value) continue;

    // Apply refrigerant filter
    if (shouldExcludeAciq(r.value)) continue;
    const stamped = stampRefrigerant(r.value);

    if (stamped.pricing.dealer != null) withDealerPrice++;
    else withoutDealerPrice++;

    products.push(stamped);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  log(`enriched ${products.length} products in ${elapsed}s (${failed} failed)`);
  log(`  with dealer price: ${withDealerPrice}`);
  log(`  without dealer price (using HVAC Direct retail): ${withoutDealerPrice}`);

  return { products };
}

if (dryRun) {
  log("DRY RUN — no DB writes");
  const { products } = await scrape();
  // Print pricing summary
  const withDealer = products.filter((p) => p.pricing.dealer != null);
  log(`\n===== PRICING SUMMARY =====`);
  log(`Total products: ${products.length}`);
  log(`With dealer pricing: ${withDealer.length}`);
  log(`Without dealer pricing: ${products.length - withDealer.length}`);
  if (withDealer.length > 0) {
    log(`\nSample (first 20 with dealer price):`);
    log(
      `${"SKU".padEnd(30)} ${"Dealer".padStart(10)} ${"Our Price".padStart(10)} ${"HVAC Direct".padStart(12)} ${"Savings".padStart(10)}`,
    );
    log("-".repeat(80));
    for (const p of withDealer.slice(0, 20)) {
      const dealer = p.pricing.dealer;
      const ourPrice = Math.round(dealer * 1.3 * 100) / 100;
      const hvac = p.pricing.msrp;
      const savings = hvac != null ? (hvac - ourPrice).toFixed(2) : "N/A";
      log(
        `${p.sku.padEnd(30)} ${("$" + dealer.toFixed(2)).padStart(10)} ${("$" + ourPrice.toFixed(2)).padStart(10)} ${hvac != null ? ("$" + hvac.toFixed(2)).padStart(12) : "N/A".padStart(12)} ${("$" + savings).padStart(10)}`,
      );
    }
  }
  process.exit(0);
}

await runSync({ portal: "aciq", scrape });
