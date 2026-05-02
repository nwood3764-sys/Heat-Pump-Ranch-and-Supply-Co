/**
 * LG distributor portal scraper.
 *
 * Architecture:
 *   1) PUBLIC PASS — Always runs. Walks lghvac.com's public residential/light
 *      commercial product pages with Playwright (the site is a JS-rendered
 *      Sitecore/Salesforce app, so headless-browser execution is required).
 *      Yields catalog data (SKU, title, model number, specs, public images,
 *      spec sheet PDFs). No pricing — LG doesn't publish prices publicly.
 *
 *   2) SALES PORTAL PASS — Optional. Only runs when LG_PORTAL_USERNAME and
 *      LG_PORTAL_PASSWORD (or LG_USER and LG_PASS) are set. Logs into
 *      us.lgsalesportal.com, navigates to the Price List page, downloads
 *      the Excel file, and parses it for dealer pricing. No CAPTCHA on
 *      this portal — just standard Salesforce Community login.
 *
 * PRICING MODEL:
 *   - Dealer cost from the LG sales portal Excel → stored as cost_equipment
 *   - Our price = dealer cost × 1.30 → stored as total_price
 *   - List price from Excel (if available) → stored as msrp for strikethrough
 *
 * Run modes:
 *   node sync-lg.mjs                  — full sync, requires Supabase env
 *   node sync-lg.mjs --dry-run        — scrape only, prints JSON, no DB
 *   node sync-lg.mjs --dry-run --limit=10
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
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

const log = (...m) => console.error("[lg]", ...m);

// LG residential & light-commercial product type IDs from lghvac.com.
// These are the productTypeId values used in the URL query params.
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
const PORTAL_URL = process.env.LG_PORTAL_URL ?? "https://us.lgsalesportal.com";

function parseMoney(s) {
  if (!s) return null;
  const m = s.replace(/[$,]/g, "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

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
      // Wait for the models table or product links to appear
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

      // Extract model numbers and their links from the models table
      const models = await page.evaluate(() => {
        const results = [];
        // Model links are typically in a table or list
        const links = document.querySelectorAll(
          'table a[href], .models-table a[href], [class*="model"] a[href]'
        );
        links.forEach((a) => {
          const text = a.textContent.trim();
          const href = a.href;
          // Model numbers are typically alphanumeric like KNSAL151A, LAN090HYV3
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

        // Collect ALL product images (model-specific)
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
        // No pricing from public pass — populated by portal pass below
        pricing: {},
      });

      if ((i + 1) % 10 === 0) log(`  visited ${i + 1}/${toVisit.length}`);
    } catch (err) {
      log(`  ${i + 1}/${toVisit.length} failed: ${item.url}`, err?.message ?? err);
    }
  }

  await context.close();
  return products;
}

/**
 * Download the Excel price list from the LG Sales Portal and parse it
 * for dealer pricing. This replaces the old PDP-scraping approach.
 *
 * The portal is a Salesforce Community site at us.lgsalesportal.com.
 * No CAPTCHA — just standard login, navigate to Price List, click
 * the Excel download button.
 */
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
    log("portal: signing in to us.lgsalesportal.com");
    await page.goto(`${PORTAL_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    // Wait for React SPA to render the login form
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // LG Sales Portal login fields (React SPA at /login)
    const userSel = 'input[placeholder="User ID"], input[type="text"]';
    const passSel = 'input[placeholder="Password"], input[type="password"]';
    const submitSel = 'button:has-text("SIGN IN"), button:has-text("Sign In"), button[type="submit"]';

    await page.waitForSelector(userSel, { timeout: 15_000 });
    await page.fill(userSel, username);
    await page.fill(passSel, password);
    await Promise.all([
      page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined),
      page.click(submitSel),
    ]);

    // Verify login succeeded
    const loginUrl = page.url();
    if (/login|verify|two[_-]?factor|otp|challenge/i.test(loginUrl)) {
      const msg = await page
        .locator('.errorMessage, [role="alert"], .message.error')
        .first()
        .textContent()
        .catch(() => null);
      throw new Error(
        `LG login appears to have failed (still on ${loginUrl}). ${msg?.trim() ?? "No error text found."}`,
      );
    }
    log("portal: login OK");

    // ---- Navigate to Price List page ----
    log("portal: navigating to Price List page");

    // Try multiple known paths for the price list
    const priceListPaths = [
      "/price-list",
      "/pricelist",
      "/s/price-list",
      "/s/pricelist",
      "/product-pricing",
      "/pricing",
    ];

    let foundPriceList = false;
    for (const path of priceListPaths) {
      try {
        await page.goto(`${PORTAL_URL}${path}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

        // Check if page loaded successfully (not a 404 or redirect to home)
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
      // Try finding the link in the navigation
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

    // Wait a moment for dynamic content to load
    await page.waitForTimeout(3000);

    // Look for download button/link
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

          // Start waiting for download before clicking
          const [download] = await Promise.all([
            page.waitForEvent("download", { timeout: 60_000 }),
            el.click(),
          ]);

          // Save the downloaded file
          downloadPath = join(downloadDir, download.suggestedFilename() || "lg-pricelist.xlsx");
          await download.saveAs(downloadPath);
          log(`portal: Excel downloaded to ${downloadPath}`);
          break;
        }
      } catch (err) {
        // Try next selector
        continue;
      }
    }

    // If no download button found, try to find a direct download URL
    if (!downloadPath) {
      log("portal: no download button found, trying direct URL extraction...");

      const directUrl = await page.evaluate(() => {
        // Look for any link that points to an Excel file
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
      // Last resort: take a screenshot for debugging and throw
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

/**
 * Augment products with dealer pricing from the downloaded Excel file.
 * Matches by model number (case-insensitive).
 */
function augmentWithExcelPricing(products, excelProducts) {
  // Build lookup by model number
  const excelByModel = new Map();
  for (const ep of excelProducts) {
    excelByModel.set(ep.model.toUpperCase(), ep);
  }

  let matched = 0;
  let unmatched = 0;

  // Match existing products from public pass
  const productByModel = new Map();
  const productBySku = new Map();
  for (const p of products) {
    if (p.modelNumber) productByModel.set(p.modelNumber.toUpperCase(), p);
    productBySku.set(p.sku.toUpperCase(), p);
  }

  for (const ep of excelProducts) {
    const key = ep.model.toUpperCase();
    let product = productByModel.get(key) || productBySku.get(key);

    if (product) {
      // Augment existing product with pricing
      product.pricing = {
        ...product.pricing,
        dealer: ep.dealer_cost,
        msrp: ep.list_price > ep.dealer_cost ? ep.list_price : null,
      };
      matched++;
    } else {
      // Portal-only product — create a new entry
      const categorySlug = mapCategory(ep.model, ep.description);
      const specs = parseSpecs(ep.description);
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
        imageUrls: [], // Will be filled by the image scraper
        documents: [],
        pricing: {
          dealer: ep.dealer_cost,
          msrp: ep.list_price > ep.dealer_cost ? ep.list_price : null,
        },
      });
      unmatched++;
    }
  }

  log(`portal-excel: matched ${matched} to public-pass products, added ${unmatched} portal-only products`);
  return products;
}

async function scrape() {
  const browser = await chromium.launch({ headless: true });
  try {
    let products = await scrapePublic(browser);
    log(`public pass: ${products.length} products`);

    // Portal pass: download Excel and merge pricing
    const excelPath = await downloadPortalExcel(browser);
    if (excelPath) {
      try {
        const excelProducts = await parseLgExcel(excelPath, { log });
        log(`portal-excel: ${excelProducts.length} products from Excel`);
        products = augmentWithExcelPricing(products, excelProducts);
      } catch (err) {
        log(`portal-excel: failed to parse Excel: ${err?.message ?? err}`);
        log("portal-excel: continuing with public-pass data only (no pricing)");
      }
    }

    // Image pass: scrape model-specific images for products missing them
    log("images: starting model-specific image scrape from lghvac.com");
    await scrapeModelImages(browser, products, { log });

    log(`scraped: ${products.length} products before refrigerant filter`);

    // LG feed: keep R-32 only, drop R-410A and discontinued.
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
    await browser.close();
  }
}

if (dryRun) {
  log("DRY RUN — no DB writes");
  const { products } = await scrape();
  console.log(JSON.stringify({ count: products.length, products }, null, 2));
  process.exit(0);
}

await runSync({ portal: "lg", scrape });
