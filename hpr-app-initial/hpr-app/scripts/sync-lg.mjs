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
 *      LG_PORTAL_PASSWORD are set. Logs into us.lgsalesportal.com (the LG
 *      dealer SPA) and augments the catalog with dealer pricing.
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
 *   LG_PORTAL_USERNAME / LG_PORTAL_PASSWORD
 */

import { chromium } from "playwright";
import { runSync } from "./sync-runner.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

const log = (...m) => console.error("[lg]", ...m);

// LG residential & light-commercial product type IDs observed on lghvac.com.
// Each becomes /residential-light-commercial/product-type?producttypeid=…&iscommercial=false
// and lists the products within that type. Add or remove as the catalog evolves.
const LG_PRODUCT_TYPES = [
  // Stable string IDs
  { id: "airtowater_heat_pump", category: "heat-pumps" },
  { id: "inverter_heat_pump_water_heater", category: null },
  // Salesforce IDs from observed product type pages
  { id: "a2x44000003XQz1", category: "mini-splits" }, // High Efficiency
  { id: "a2x44000003XQyd", category: "mini-splits" }, // Extended Piping
];

const PUBLIC_BASE = "https://lghvac.com";

async function scrapePublic(browser) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (HeatPumpRanchBot/1.0; +https://heat-pump-ranch-and-supply-co.netlify.app)",
  });
  const page = await context.newPage();
  const collected = new Map();

  for (const t of LG_PRODUCT_TYPES) {
    const url = `${PUBLIC_BASE}/residential-light-commercial/product-type?producttypeid=${t.id}&iscommercial=false`;
    log(`public: ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      // Wait for the product grid to render. The site uses a card list
      // populated client-side; we wait for any anchor whose href contains
      // "/product-detail" which is the convention observed.
      await page.waitForSelector('a[href*="/product-detail"], .product-card a', {
        timeout: 30_000,
      });

      // Collect product detail URLs
      const links = await page.$$eval(
        'a[href*="/product-detail"], .product-card a',
        (anchors) =>
          anchors
            .map((a) => a.getAttribute("href"))
            .filter((h) => h && h.includes("/product-detail"))
            .map((h) => (h.startsWith("http") ? h : new URL(h, location.origin).toString())),
      );

      log(`  -> ${links.length} product links`);
      for (const href of links) {
        if (!collected.has(href)) collected.set(href, { url: href, categorySlug: t.category });
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

        // Title — h1 is the dependable anchor
        const title = txt("h1") || txt(".product-title") || txt(".pdp-title");

        // Model number — LG uses "Model:" or "Model Number:" labels
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

        // Spec rows — LG's spec table uses dl/dt/dd or table rows
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

        // Description
        const description =
          txt(".product-description") ||
          txt(".pdp-description") ||
          txt('[itemprop="description"]') ||
          null;

        // Main image
        const ogImage = document.querySelector('meta[property="og:image"]')?.content ?? null;
        const heroImg =
          document.querySelector(".product-image img, .pdp-image img")?.src ?? null;

        // PDFs (spec sheets, install manuals)
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
          imageUrls: [heroImg, ogImage].filter(Boolean),
          documents: docs,
        };
      });

      const sku = data.modelNumber || item.url.split("/").pop();
      if (!sku) {
        log(`  ${i + 1}/${toVisit.length} skip (no SKU): ${item.url}`);
        continue;
      }

      products.push({
        sourceId: sku, // LG's stable id is the model number
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
        // No pricing from public pass — populated below if portal pass runs
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

async function augmentFromSalesPortal(browser, products) {
  const username = process.env.LG_PORTAL_USERNAME;
  const password = process.env.LG_PORTAL_PASSWORD;
  if (!username || !password) {
    log("portal: LG_PORTAL_USERNAME/PASSWORD not set, skipping dealer-pricing pass");
    return products;
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    log("portal: signing in to us.lgsalesportal.com");
    await page.goto("https://us.lgsalesportal.com/login.jsp", {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    // The portal is a SPA. Selectors below need confirmation against the
    // live login page once dealer credentials are set; mark as TODO.
    // TODO: confirm selectors after first run with real credentials.
    await page.waitForSelector('input[type="text"], input[name="userId"], input[name="email"]', {
      timeout: 30_000,
    });
    await page.fill('input[type="text"], input[name="userId"], input[name="email"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForLoadState("networkidle", { timeout: 60_000 });

    // For each product, look up dealer price by model number.
    // TODO: confirm portal search/lookup endpoint after first run.
    log("portal: pricing lookup not yet implemented — skipping for now");
  } catch (err) {
    log("portal: failed —", err?.message ?? err);
  } finally {
    await context.close();
  }

  return products;
}

async function scrape() {
  const browser = await chromium.launch({ headless: true });
  try {
    let products = await scrapePublic(browser);
    products = await augmentFromSalesPortal(browser, products);
    log(`scrape complete: ${products.length} products`);
    return { products };
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
