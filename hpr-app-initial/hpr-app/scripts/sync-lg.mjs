/**
 * LG product scraper — THREE-PASS DESIGN.
 *
 * Architecture:
 *   1) HVAC DIRECT PASS — Always runs. Walks hvacdirect.com's LG brand
 *      subcategory pages (single-zone + multi-zone mini splits). Uses
 *      cheerio (no browser needed — Magento 2 server-rendered HTML).
 *      Yields catalog data: SKU, title, model number, specs, images,
 *      spec-sheet PDFs, descriptions, and HVAC Direct list pricing.
 *
 *   2) PUBLIC PASS — Always runs. Walks lghvac.com's public residential/
 *      light-commercial product pages with Playwright (JS-rendered
 *      Sitecore/Salesforce app). Yields supplemental catalog data for
 *      models NOT found on HVAC Direct.
 *
 *   3) SALES PORTAL PASS — Optional. Only runs when LG_PORTAL_USERNAME
 *      and LG_PORTAL_PASSWORD (or LG_USER / LG_PASS) are set. Logs into
 *      www.lghvacpro.com/professional, downloads the Excel price list,
 *      and parses it for dealer pricing.
 *
 * PRICING MODEL:
 *   - Dealer cost from the LG sales portal Excel → stored as cost_equipment
 *   - HVAC Direct "Was" price (highest displayed) → stored as msrp (strikethrough)
 *   - Our selling price = dealer cost × 1.20 (ALWAYS)
 *   - Strikethrough shown only when msrp > our price
 *
 * Run modes:
 *   node sync-lg.mjs                  — full sync, requires Supabase env
 *   node sync-lg.mjs --dry-run        — scrape only, prints JSON, no DB
 *   node sync-lg.mjs --dry-run --limit=10
 *   node sync-lg.mjs --skip-public    — skip lghvac.com pass
 *   node sync-lg.mjs --skip-hvacdirect — skip HVAC Direct pass
 *
 * Required env for non-dry-run:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   LG_PORTAL_USERNAME / LG_PORTAL_PASSWORD (or LG_USER / LG_PASS)
 */

import { chromium } from "playwright";
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
  shouldExcludeLg,
  stampRefrigerant,
} from "./lib/refrigerant.mjs";
import {
  parseLgExcel,
  mapCategory,
  getProductType,
  parseSpecs,
} from "./lib/lg-excel-parser.mjs";
import { scrapeModelImages } from "./lib/lg-image-scraper.mjs";
import { parallelMap } from "./lib/concurrent.mjs";
import { normalizeSpecs } from "./lib/spec-normalizer.mjs";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const DETAIL_CONCURRENCY = Number(process.env.SCRAPER_CONCURRENCY) || 6;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipPublic = args.includes("--skip-public");
const skipHvacdirect = args.includes("--skip-hvacdirect");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

const log = (...m) => console.error("[lg]", ...m);

// ─────────────────────────────────────────────────────────────────────
// HVAC Direct LG category URLs (confirmed live)
// ─────────────────────────────────────────────────────────────────────
const LG_HVACDIRECT_CATEGORIES = [
  "/brands/lg-hvac-systems-products/lg-mini-splits/lg-single-zone-mini-split-systems.html",
  "/brands/lg-hvac-systems-products/lg-mini-splits/lg-multi-zone-mini-split-systems.html",
];

// ─────────────────────────────────────────────────────────────────────
// LG public site (lghvac.com) product type IDs
// ─────────────────────────────────────────────────────────────────────
const LG_PRODUCT_TYPES = [
  // Single Zone
  { id: "artcool_premier", category: "mini-splits", class: "Single Zone" },
  { id: "artcool_mirror", category: "mini-splits", class: "Single Zone" },
  { id: "artcool_deluxe", category: "mini-splits", class: "Single Zone" },
  { id: "mega", category: "mini-splits", class: "Single Zone" },
  { id: "low_wall_console", category: "mini-splits", class: "Single Zone" },
  { id: "gas_furnace", category: "furnaces", class: "Single Zone" },
  { id: "multiposition_air_handler", category: "air-handlers", class: "Single Zone" },
  { id: "low_static", category: "mini-splits", class: "Single Zone" },
  // Multi Zone Indoor
  { id: "1way_ceiling_cassette", category: "mini-splits", class: "Multi Zone Indoor" },
  { id: "a_coil", category: "air-handlers", class: "Multi Zone Indoor" },
  { id: "4way_ceiling_cassette", category: "mini-splits", class: "Multi Zone Indoor" },
  { id: "high_static_ducted", category: "mini-splits", class: "Multi Zone Indoor" },
  { id: "mid_static_horizontal_ducted", category: "mini-splits", class: "Multi Zone Indoor" },
  // Multi Zone Outdoor
  { id: "high_efficiency", category: "heat-pumps", class: "Multi Zone Outdoor" },
  { id: "standard_efficiency", category: "heat-pumps", class: "Multi Zone Outdoor" },
  { id: "extended_piping", category: "heat-pumps", class: "Multi Zone Outdoor" },
  // Water Heating
  { id: "inverter_heat_pump_water_heater", category: null, class: "Water Heating" },
];

const PUBLIC_BASE = "https://lghvac.com";
const PORTAL_URL = process.env.LG_PORTAL_URL ?? "https://www.lghvacpro.com/professional";

function parseMoney(s) {
  if (!s) return null;
  const m = s.replace(/[$,]/g, "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function isLikelyRealSku(sku) {
  if (typeof sku !== "string") return false;
  return /^[A-Z0-9][A-Z0-9./_-]{2,40}$/i.test(sku) && !/\s/.test(sku);
}

// ─────────────────────────────────────────────────────────────────────
// PASS 1: HVAC Direct (primary source for images, docs, specs, pricing)
// ─────────────────────────────────────────────────────────────────────

async function scrapeHvacdirect() {
  const seen = new Map();
  for (const path of LG_HVACDIRECT_CATEGORIES) {
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
 * Enrich an HVAC Direct listing entry into a full ScrapedProduct.
 */
async function enrichHvacdirectEntry(entry) {
  if (!entry.url) return null;
  const detail = await fetchProductDetail(entry.url);
  const { primarySku, allSkus } = parseModelLine(entry.modelLine || detail.skuValue);
  if (!primarySku) {
    log(`  skip (no SKU): ${entry.title}`);
    return null;
  }
  // Skip "Design Your Own" configurator products (not real SKUs)
  if (!isLikelyRealSku(primarySku) || /design\s+your\s+own/i.test(entry.title)) {
    log(`  skip (configurator/non-SKU "${primarySku}"): ${entry.title}`);
    return null;
  }

  // For multi-zone systems, use the full model line as SKU to preserve
  // unique system combinations (e.g., "KUMXB181A / 2-KNMAB071A" vs
  // "KUMXB181A / KNUAB091A / KNMAB071A" are different products).
  // Normalize: join all SKUs with " / " and use that as the product SKU.
  const isMultiZone = allSkus.length > 1 && /multi|dual|\d\s*zone|\d\s*\+\s*\d/i.test(entry.title);
  const effectiveSku = isMultiZone
    ? allSkus.join(" / ")
    : primarySku;
  const categorySlug = mapBreadcrumbsToCategory(detail.breadcrumbs) || "mini-splits";

  const rawSpecs = {
    ...detail.specs,
    all_skus: allSkus,
    hvacdirect_breadcrumbs: detail.breadcrumbs,
    source_origin: "hvacdirect",
    SKU: effectiveSku, // Override scraped SKU (may be accessory) with actual product model
  };
  const specs = normalizeSpecs(rawSpecs, entry.title || detail.titleH1, categorySlug);

  // PRICING MODEL:
  //   - oldPrice = HVAC Direct "Was" price (highest displayed price on their site)
  //   - salePrice = HVAC Direct "Your Low Price" (their actual selling price)
  //   - For our strikethrough (msrp): use the HIGHEST price shown on their site
  //     which is oldPrice when available, otherwise salePrice
  //   - For fallback cost basis (when no portal dealer cost): use salePrice
  //     since it's closer to actual market price
  const msrpPrice = entry.oldPrice ?? entry.salePrice ?? null;
  const fallbackCost = entry.salePrice ?? entry.oldPrice ?? null;
  const pricing = {
    retail: fallbackCost,  // fallback cost basis if no portal dealer cost
    msrp: msrpPrice,      // highest HVAC Direct price for strikethrough
  };

  const imageUrls = [];
  if (entry.thumbnailUrl) imageUrls.push(entry.thumbnailUrl);
  if (detail.ogImage && detail.ogImage !== entry.thumbnailUrl) imageUrls.push(detail.ogImage);

  return {
    sourceId: entry.sourceId,
    sku: effectiveSku,
    brand: "LG",
    title: entry.title || detail.titleH1,
    modelNumber: primarySku,
    shortDescription: null,
    description: detail.description,
    categorySlug,
    productType: "equipment",
    specs,
    sourceUrl: entry.url,
    imageUrls,
    documents: detail.documents,
    pricing,
  };
}

async function enrichHvacdirectBatch(entries) {
  const cap = limit ? entries.slice(0, limit) : entries;
  if (limit) log(`hvacdirect: --limit=${limit}: enriching ${cap.length} of ${entries.length}`);

  let done = 0;
  const t0 = Date.now();
  const results = await parallelMap(cap, async (e) => {
    const product = await enrichHvacdirectEntry(e);
    done++;
    if (done % 25 === 0) {
      const rps = (done / ((Date.now() - t0) / 1000)).toFixed(1);
      log(`  hvacdirect: enriched ${done}/${cap.length} (${rps}/s)`);
    }
    return product;
  }, DETAIL_CONCURRENCY);

  const products = [];
  let failed = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.ok) {
      failed++;
      log(`  hvacdirect: ${i + 1}/${cap.length} failed: ${cap[i].url} — ${r.error?.message ?? r.error}`);
      continue;
    }
    if (r.value) products.push(r.value);
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  log(`  hvacdirect: enriched ${products.length} in ${elapsed}s (${failed} failed)`);
  return products;
}

// ─────────────────────────────────────────────────────────────────────
// PASS 2: lghvac.com public site (supplemental for models not on HVAC Direct)
// ─────────────────────────────────────────────────────────────────────

async function scrapePublic(browser) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (HeatPumpRanchBot/1.0; +https://heat-pump-ranch-and-supply-co.netlify.app)",
  });
  const page = await context.newPage();
  const collected = new Map();

  for (const t of LG_PRODUCT_TYPES) {
    const classParam = t.class ? `&class=${encodeURIComponent(t.class)}` : "";
    const url = `${PUBLIC_BASE}/residential-light-commercial/product-type/?productTypeId=${t.id}&iscommercial=false${classParam}`;
    log(`public: ${url}`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForSelector(
        'table a, .models-table a, a[href*="product-detail"], [class*="model"] a',
        { timeout: 30_000 },
      ).catch(() => {});

      // Click "View More" button if present to load all models
      const viewMoreBtn = page.locator('button:has-text("View More"), a:has-text("View More")');
      while (await viewMoreBtn.count() > 0 && await viewMoreBtn.isVisible().catch(() => false)) {
        await viewMoreBtn.click();
        await page.waitForTimeout(1500);
      }

      const models = await page.evaluate(() => {
        const results = [];
        const links = document.querySelectorAll(
          'table a[href], .models-table a[href], [class*="model"] a[href]'
        );
        links.forEach((a) => {
          const text = a.textContent.trim();
          const href = a.href;
          if (text && /^[A-Z0-9][A-Z0-9-]{3,}$/i.test(text)) {
            results.push({ model: text, url: href });
          }
        });
        return results;
      });

      log(`  -> ${models.length} models found`);
      for (const m of models) {
        if (!collected.has(m.model)) {
          collected.set(m.model, {
            url: m.url,
            model: m.model,
            categorySlug: t.category,
            productTypeId: t.id,
          });
        }
      }
    } catch (err) {
      log(`  type ${t.id} failed:`, err?.message ?? err);
    }
  }

  // Visit each detail page and extract structured fields
  const products = [];
  const list = [...collected.values()];
  const toVisit = limit ? list.slice(0, limit) : list;
  if (limit) log(`--limit=${limit}: visiting ${toVisit.length} of ${list.length}`);

  for (let i = 0; i < toVisit.length; i++) {
    const item = toVisit[i];
    try {
      await page.goto(item.url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForSelector("h1, .product-title, .pdp-title", { timeout: 30_000 });

      const data = await page.evaluate(() => {
        const txt = (sel) => document.querySelector(sel)?.textContent?.trim() ?? null;

        const title = txt("h1") || txt(".product-title") || txt(".pdp-title");

        let modelNumber = null;
        const modelLabel = [...document.querySelectorAll("*")].find((el) =>
          /^model(\s+number)?:?$/i.test(el.textContent.trim()),
        );
        if (modelLabel) {
          modelNumber = modelLabel.nextElementSibling?.textContent?.trim() ?? null;
        }
        if (!modelNumber) {
          const m = document.body.innerText.match(/Model(?:\s+Number)?:\s*([A-Z0-9-]+)/i);
          if (m) modelNumber = m[1];
        }

        const specs = {};
        document
          .querySelectorAll(".specs dl, .product-specs dl, .specifications dl")
          .forEach((dl) => {
            dl.querySelectorAll("dt").forEach((dt) => {
              const dd = dt.nextElementSibling;
              const key = dt.textContent.trim();
              const val = dd?.textContent?.trim();
              if (key && val) specs[key] = val;
            });
          });
        document
          .querySelectorAll("table.specs tr, .specs-table tr, .specifications table tr")
          .forEach((tr) => {
            const cells = tr.querySelectorAll("th, td");
            if (cells.length === 2) {
              const k = cells[0].textContent.trim();
              const v = cells[1].textContent.trim();
              if (k && v) specs[k] = v;
            }
          });

        const description =
          txt(".product-description") ||
          txt(".pdp-description") ||
          txt('[itemprop="description"]') ||
          null;

        const ogImage = document.querySelector('meta[property="og:image"]')?.content ?? null;
        const heroImg =
          document.querySelector(".product-image img, .pdp-image img")?.src ?? null;

        const allImages = [];
        document.querySelectorAll(
          ".product-image img, .pdp-image img, .product-gallery img, " +
          ".gallery img, .slick-slide img, [class*='product'] img, " +
          "[class*='gallery'] img"
        ).forEach((img) => {
          const src = img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy");
          if (src && !src.includes("placeholder") && !src.includes("icon") && !allImages.includes(src)) {
            allImages.push(src);
          }
        });

        const docs = [...document.querySelectorAll('a[href$=".pdf"]')].map((a) => ({
          url: a.href,
          name: a.textContent.trim() || "Document",
          type: a.textContent.trim() || "Document",
        }));

        return {
          title,
          modelNumber,
          specs,
          description,
          imageUrls: allImages.length > 0 ? allImages : [heroImg, ogImage].filter(Boolean),
          documents: docs,
        };
      });

      const sku = data.modelNumber || item.model || item.url.split("/").pop();
      if (!sku) {
        log(`  ${i + 1}/${toVisit.length} skip (no SKU): ${item.url}`);
        continue;
      }

      products.push({
        sourceId: sku,
        sku,
        brand: "LG",
        title: data.title || sku,
        modelNumber: data.modelNumber,
        description: data.description,
        categorySlug: item.categorySlug,
        productType: "equipment",
        specs: data.specs,
        sourceUrl: item.url,
        imageUrls: data.imageUrls,
        documents: data.documents,
        pricing: {},  // No pricing from lghvac.com
      });

      if ((i + 1) % 10 === 0) log(`  visited ${i + 1}/${toVisit.length}`);
    } catch (err) {
      log(`  ${i + 1}/${toVisit.length} failed: ${item.url}`, err?.message ?? err);
    }
  }

  await context.close();
  return products;
}

// ─────────────────────────────────────────────────────────────────────
// PASS 3: LG Sales Portal (dealer pricing Excel)
// ─────────────────────────────────────────────────────────────────────

async function downloadPortalExcel(browser) {
  const username = process.env.LG_PORTAL_USERNAME ?? process.env.LG_USER;
  const password = process.env.LG_PORTAL_PASSWORD ?? process.env.LG_PASS;
  if (!username || !password) {
    log("portal: LG_PORTAL_USERNAME/PASSWORD (or LG_USER/LG_PASS) not set, skipping dealer-pricing pass");
    return null;
  }

  const downloadDir = join(tmpdir(), `hpr-lg-excel-${Date.now()}`);
  mkdirSync(downloadDir, { recursive: true });

  const context = await browser.newContext({
    acceptDownloads: true,
  });
  const page = await context.newPage();

  try {
    // ---- Login ----
    log("portal: signing in to lghvacpro.com via native setter + button click");

    await page.goto(`${PORTAL_URL}/s/login/`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    await page.waitForSelector('input[placeholder="Username"]', { timeout: 15_000 });

    // Use native input value setter to trigger LWC reactivity
    await page.evaluate(({ username, password }) => {
      function setInputValue(input, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const usernameInput = document.querySelector('input[placeholder="Username"]');
      const passwordInput = document.querySelector('input[placeholder="Password"]');
      setInputValue(usernameInput, username);
      setInputValue(passwordInput, password);
    }, { username, password });

    await page.waitForTimeout(200);
    await page.click('button:has-text("Log in")');

    await page.waitForURL(/\/professional\/s\/(?!login)/, { timeout: 30_000 }).catch(async () => {
      const url = page.url();
      if (/\/login/i.test(url)) {
        const msg = await page
          .locator('.errorMessage, [role="alert"], .message.error, .error')
          .first()
          .textContent()
          .catch(() => null);
        throw new Error(
          `LG login failed (still on ${url}). ${msg?.trim() ?? "No error text found."}`,
        );
      }
    });

    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    log("portal: login OK, now at:", page.url());

    // ---- Navigate to Price List page ----
    log("portal: navigating to Price List page");

    const priceListPaths = [
      "/s/price-list",
      "/s/pricelist",
      "/s/product-pricing",
      "/s/pricing",
      "/s/price-book",
    ];

    let foundPriceList = false;
    for (const path of priceListPaths) {
      try {
        await page.goto(`${PORTAL_URL}${path}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

        const currentUrl = page.url();
        if (!currentUrl.includes("/login") && !currentUrl.endsWith("/s/")) {
          foundPriceList = true;
          log(`portal: found price list at ${path}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!foundPriceList) {
      log("portal: price list path not found directly, searching navigation...");
      await page.goto(`${PORTAL_URL}/s/`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

      const priceLink = await page.evaluate(() => {
        const links = [...document.querySelectorAll("a")];
        const match = links.find((a) =>
          /price\s*list|pricing|download.*price/i.test(a.textContent),
        );
        return match?.href ?? null;
      });

      if (priceLink) {
        log(`portal: found price list link: ${priceLink}`);
        await page.goto(priceLink, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        foundPriceList = true;
      }
    }

    if (!foundPriceList) {
      throw new Error("Could not find the Price List page on the LG portal");
    }

    // ---- Click Excel Download button ----
    log("portal: looking for Excel download button");
    await page.waitForTimeout(3000);

    const downloadSelectors = [
      'a[href*=".xlsx"], a[href*=".xls"]',
      'button:has-text("Excel"), button:has-text("Download")',
      'a:has-text("Excel"), a:has-text("Download Excel")',
      'a:has-text("Export"), a:has-text("Download")',
      '[class*="download"] a, [class*="export"] a',
      'a[download]',
    ];

    let downloadPath = null;

    for (const sel of downloadSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.count() > 0) {
          log(`portal: found download element with selector: ${sel}`);

          const [download] = await Promise.all([
            page.waitForEvent("download", { timeout: 60_000 }),
            el.click(),
          ]);

          downloadPath = join(downloadDir, download.suggestedFilename() || "lg-pricelist.xlsx");
          await download.saveAs(downloadPath);
          log(`portal: Excel downloaded to ${downloadPath}`);
          break;
        }
      } catch (err) {
        continue;
      }
    }

    if (!downloadPath) {
      log("portal: no download button found, trying direct URL extraction...");

      const directUrl = await page.evaluate(() => {
        const links = [...document.querySelectorAll("a[href]")];
        const excelLink = links.find((a) =>
          /\.(xlsx?|csv)(\?|$)/i.test(a.href) ||
          /download|export|price/i.test(a.href),
        );
        return excelLink?.href ?? null;
      });

      if (directUrl) {
        log(`portal: found direct download URL: ${directUrl}`);
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 60_000 }),
          page.goto(directUrl),
        ]);
        downloadPath = join(downloadDir, download.suggestedFilename() || "lg-pricelist.xlsx");
        await download.saveAs(downloadPath);
        log(`portal: Excel downloaded to ${downloadPath}`);
      }
    }

    if (!downloadPath || !existsSync(downloadPath)) {
      const screenshotPath = join(downloadDir, "price-list-page.png");
      await page.screenshot({ path: screenshotPath, fullPage: true });
      log(`portal: screenshot saved to ${screenshotPath} for debugging`);
      throw new Error(
        "Could not find or trigger Excel download on the Price List page. " +
        "The page structure may have changed.",
      );
    }

    return downloadPath;
  } finally {
    await context.close();
  }
}

// ─────────────────────────────────────────────────────────────────────
// Merge logic: combine HVAC Direct + lghvac.com + Portal Excel
// ─────────────────────────────────────────────────────────────────────

/**
 * Merge two product lists by SKU. HVAC Direct entries take precedence
 * for images, docs, and pricing (msrp). Public-site entries fill gaps
 * for models not found on HVAC Direct.
 */
function mergeBySku(hvacdirectProducts, publicProducts) {
  const map = new Map();
  // HVAC Direct is primary — add first
  for (const p of hvacdirectProducts) map.set(p.sku.toUpperCase(), p);

  // Public-site products fill gaps
  for (const p of publicProducts) {
    const key = p.sku.toUpperCase();
    const existing = map.get(key);
    if (!existing) {
      // New model not on HVAC Direct — add it
      map.set(key, p);
      continue;
    }
    // Existing from HVAC Direct — union images and docs from public site
    const imgUrls = new Set(existing.imageUrls ?? []);
    for (const u of p.imageUrls ?? []) {
      if (!imgUrls.has(u)) {
        existing.imageUrls.push(u);
        imgUrls.add(u);
      }
    }
    const docUrls = new Set((existing.documents ?? []).map((d) => d.url));
    for (const d of p.documents ?? []) {
      if (!docUrls.has(d.url)) {
        existing.documents.push(d);
        docUrls.add(d.url);
      }
    }
    // Fill missing specs from public site, then re-normalize
    existing.specs = { ...(p.specs ?? {}), ...(existing.specs ?? {}) };
    existing.specs.SKU = existing.sku; // Ensure correct product model for normalizer
    normalizeSpecs(existing.specs, existing.title, existing.categorySlug);
  }
  return [...map.values()];
}

/**
 * Augment products with dealer pricing from the downloaded Excel file.
 * Matches by model number (case-insensitive).
 */
function augmentWithExcelPricing(products, excelProducts) {
  const excelByModel = new Map();
  for (const ep of excelProducts) {
    excelByModel.set(ep.model.toUpperCase(), ep);
  }

  let matched = 0;
  let unmatched = 0;

  const productByModel = new Map();
  const productBySku = new Map();
  for (const p of products) {
    if (p.modelNumber) productByModel.set(p.modelNumber.toUpperCase(), p);
    productBySku.set(p.sku.toUpperCase(), p);
  }

  // Also try matching by individual SKUs in the all_skus array
  const productByAnySku = new Map();
  for (const p of products) {
    const allSkus = p.specs?.all_skus ?? [];
    for (const s of allSkus) {
      productByAnySku.set(s.toUpperCase(), p);
    }
  }

  for (const ep of excelProducts) {
    const key = ep.model.toUpperCase();
    let product = productByModel.get(key) || productBySku.get(key) || productByAnySku.get(key);

    if (product) {
      // Augment existing product with dealer pricing
      product.pricing = {
        ...product.pricing,
        dealer: ep.dealer_cost,
        // Keep existing msrp from HVAC Direct if present; otherwise use Excel list price
        msrp: product.pricing?.msrp ?? (ep.list_price > ep.dealer_cost ? ep.list_price : null),
      };
      matched++;
    } else {
      // Portal-only product — create a new entry
      const categorySlug = mapCategory(ep.model, ep.description);
      const parsedSpecs = parseSpecs(ep.description);
      parsedSpecs.SKU = ep.model; // Ensure correct product model for normalizer
      const specs = normalizeSpecs(parsedSpecs, `LG ${ep.description}`, categorySlug);
      const productType = getProductType(ep.description);

      products.push({
        sourceId: `lg-portal-${ep.model}`,
        sku: ep.model,
        brand: "LG",
        title: `LG ${ep.description}` || `LG ${ep.model}`,
        modelNumber: ep.model,
        description: ep.description,
        categorySlug,
        productType,
        specs,
        sourceUrl: `${PORTAL_URL}/s/price-list`,
        imageUrls: [],
        documents: [],
        pricing: {
          dealer: ep.dealer_cost,
          msrp: ep.list_price > ep.dealer_cost ? ep.list_price : null,
        },
      });
      unmatched++;
    }
  }

  log(`portal-excel: matched ${matched} to existing products, added ${unmatched} portal-only products`);
  return products;
}

// ─────────────────────────────────────────────────────────────────────
// Main scrape orchestrator
// ─────────────────────────────────────────────────────────────────────

async function scrape() {
  let hvacdirectProducts = [];
  let publicProducts = [];

  // PASS 1: HVAC Direct (no browser needed — cheerio/fetch)
  if (!skipHvacdirect) {
    const hvacdirectEntries = await scrapeHvacdirect();
    hvacdirectProducts = await enrichHvacdirectBatch(hvacdirectEntries);
    log(`hvacdirect: ${hvacdirectProducts.length} enriched products`);
  }

  // PASS 2 & 3 require Playwright — launch browser (graceful failure)
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    log(`browser: Playwright unavailable (${err?.message?.split("\n")[0] ?? err}) — skipping public + portal passes`);
  }

  try {
    if (browser && !skipPublic) {
      publicProducts = await scrapePublic(browser);
      log(`public pass: ${publicProducts.length} products`);
    }

    // Merge HVAC Direct (primary) + public site (supplemental)
    let products = mergeBySku(hvacdirectProducts, publicProducts);
    log(`merged (hvac-direct + public): ${products.length} products`);

    // PASS 3: Portal Excel pricing (non-fatal)
    if (browser) {
      try {
        const excelPath = await downloadPortalExcel(browser);
        if (excelPath) {
          const excelProducts = await parseLgExcel(excelPath, { log });
          log(`portal-excel: ${excelProducts.length} products from Excel`);
          products = augmentWithExcelPricing(products, excelProducts);
        }
      } catch (err) {
        log(`portal: failed (${err?.message ?? err}) — continuing without dealer pricing`);
      }
    }

    // Image backfill: scrape model-specific images for products still missing them
    if (browser) {
      const missingImages = products.filter((p) => !p.imageUrls || p.imageUrls.length === 0);
      if (missingImages.length > 0) {
        log(`images: ${missingImages.length} products missing images, running lghvac.com backfill`);
        await scrapeModelImages(browser, missingImages, { log });
      }
    }

    log(`scraped: ${products.length} products before refrigerant filter`);

    // LG feed: keep R-32 only, drop R-410A and discontinued
    let dropped = 0;
    let r32 = 0;
    let r410a = 0;
    let unknown = 0;
    const kept = [];
    for (const p of products) {
      const r = detectRefrigerant(p);
      if (r === "R-32") r32++;
      else if (r === "R-410A") r410a++;
      else if (r == null) unknown++;
      if (shouldExcludeLg(p)) {
        dropped++;
        continue;
      }
      kept.push(stampRefrigerant(p));
    }
    log(
      `filtered: kept ${kept.length} (R-32), dropped ${dropped} ` +
      `(R-410A=${r410a}, unknown=${unknown}, other=${dropped - r410a - unknown})`,
    );
    return { products: kept };
  } finally {
    if (browser) await browser.close();
  }
}

if (dryRun) {
  log("DRY RUN — no DB writes");
  const { products } = await scrape();
  console.log(JSON.stringify({ count: products.length, products }, null, 2));
  process.exit(0);
}

await runSync({ portal: "lg", scrape });
