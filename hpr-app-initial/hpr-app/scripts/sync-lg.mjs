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
 *      us.lgsalesportal.com (the LG dealer SPA) and augments the catalog
 *      with dealer pricing.
 *
 * PRICING MODEL:
 *   - Dealer cost from the LG sales portal → stored as cost_equipment
 *   - Our price = dealer cost × 1.30 → stored as total_price
 *   - HVAC Direct price (if available) → stored as msrp for strikethrough
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

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

const log = (...m) => console.error("[lg]", ...m);

// LG residential & light-commercial product type IDs observed on lghvac.com.
const LG_PRODUCT_TYPES = [
  { id: "airtowater_heat_pump", category: "heat-pumps" },
  { id: "inverter_heat_pump_water_heater", category: null },
  { id: "a2x44000003XQz1", category: "mini-splits" }, // High Efficiency
  { id: "a2x44000003XQyd", category: "mini-splits" }, // Extended Piping
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
    const url = `${PUBLIC_BASE}/residential-light-commercial/product-type?producttypeid=${t.id}&iscommercial=false`;
    log(`public: ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForSelector('a[href*="/product-detail"], .product-card a', {
        timeout: 30_000,
      });

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
 * Augment products with dealer pricing from the LG sales portal.
 *
 * The portal is a Salesforce Community site at us.lgsalesportal.com.
 * After login, product pages show "Dealer Price" / "Net Price".
 * We scroll the /s/products listing to collect all PDP links, then
 * visit each to extract the dealer cost.
 */
async function augmentFromSalesPortal(browser, products) {
  const username = process.env.LG_PORTAL_USERNAME ?? process.env.LG_USER;
  const password = process.env.LG_PORTAL_PASSWORD ?? process.env.LG_PASS;
  if (!username || !password) {
    log("portal: LG_PORTAL_USERNAME/PASSWORD (or LG_USER/LG_PASS) not set, skipping dealer-pricing pass");
    return products;
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ---- Login ----
    log("portal: signing in to us.lgsalesportal.com");
    await page.goto(`${PORTAL_URL}/s/login/`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Salesforce community login fields
    const userSel = 'input[name="username"], input[type="email"], #username';
    const passSel = 'input[name="password"], input[type="password"], #password';
    const submitSel = 'button[type="submit"], input[name="Login"], .loginButton';

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

    // ---- Collect portal product links ----
    log("portal: navigating to product listing");
    await page.goto(`${PORTAL_URL}/s/products`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // LG portal uses infinite scroll. Scroll until no new product cards appear.
    let lastCount = 0;
    for (let i = 0; i < 60; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000 + Math.random() * 500);
      const count = await page.locator('a[href*="/s/product/"]').count();
      if (count === lastCount) break;
      lastCount = count;
    }

    const portalLinks = await page.$$eval(
      'a[href*="/s/product/"]',
      (els) => Array.from(new Set(els.map((e) => e.href))),
    );
    log(`portal: found ${portalLinks.length} product links`);

    // ---- Build a map of model → product for matching ----
    const productByModel = new Map();
    const productBySku = new Map();
    for (const p of products) {
      if (p.modelNumber) productByModel.set(p.modelNumber.toUpperCase(), p);
      productBySku.set(p.sku.toUpperCase(), p);
    }

    // ---- Visit each portal PDP and extract dealer price ----
    let matched = 0;
    let noPrice = 0;
    for (let i = 0; i < portalLinks.length; i++) {
      const pdpUrl = portalLinks[i];
      try {
        await page.goto(pdpUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForTimeout(800); // Lightning hydration

        // Extract model number and price from the portal PDP
        const pdpData = await page.evaluate(() => {
          const txt = (sel) => document.querySelector(sel)?.textContent?.trim() ?? null;

          // Title
          const title = txt("h1") || txt(".slds-page-header__title");

          // Model number
          let model = null;
          const modelEl = [...document.querySelectorAll("*")].find((el) =>
            /^(model\s*#?|model\s+number|catalog\s*#?):?$/i.test(el.textContent.trim()),
          );
          if (modelEl) {
            model = modelEl.nextElementSibling?.textContent?.trim() ?? null;
          }
          if (!model) {
            const m = document.body.innerText.match(/Model(?:\s+Number)?(?:\s*#)?:\s*([A-Z0-9-]+)/i);
            if (m) model = m[1];
          }

          // Dealer price — look for price labels
          let priceText = null;
          const priceLabels = ["Dealer Price", "Net Price", "Price", "Your Price"];
          for (const label of priceLabels) {
            const el = [...document.querySelectorAll("*")].find(
              (e) => e.textContent.trim().toLowerCase() === label.toLowerCase()
                  || e.textContent.trim().toLowerCase().startsWith(label.toLowerCase() + ":")
            );
            if (el) {
              // Price is usually in the parent or next sibling
              const parent = el.parentElement;
              const sibling = el.nextElementSibling;
              const parentText = parent?.textContent ?? "";
              const siblingText = sibling?.textContent ?? "";
              // Look for dollar amount
              const priceMatch = (siblingText + " " + parentText).match(/\$[\d,.]+/);
              if (priceMatch) {
                priceText = priceMatch[0];
                break;
              }
            }
          }

          // Fallback: look for any prominent price display
          if (!priceText) {
            const priceEls = document.querySelectorAll('[class*="price"], [class*="Price"]');
            for (const el of priceEls) {
              const match = el.textContent.match(/\$[\d,.]+/);
              if (match) {
                priceText = match[0];
                break;
              }
            }
          }

          return { title, model, priceText };
        });

        const dealerCost = parseMoney(pdpData.priceText);
        if (dealerCost == null) {
          noPrice++;
          if ((i + 1) % 20 === 0) log(`  portal: ${i + 1}/${portalLinks.length} (no price: ${pdpUrl})`);
          continue;
        }

        // Match to a public-pass product by model number
        const modelKey = pdpData.model?.toUpperCase();
        let product = modelKey ? productByModel.get(modelKey) : null;
        if (!product && modelKey) product = productBySku.get(modelKey);

        if (product) {
          product.pricing = {
            ...product.pricing,
            dealer: dealerCost,
          };
          matched++;
          log(`  portal: ${product.sku} → dealer cost $${dealerCost.toFixed(2)}`);
        } else {
          // Portal-only product (not found in public pass) — add it
          const sku = pdpData.model || pdpUrl.split("/").pop();
          if (sku) {
            products.push({
              sourceId: sku,
              sku,
              brand: "LG",
              title: pdpData.title || sku,
              modelNumber: pdpData.model,
              description: null,
              categorySlug: null,
              productType: "equipment",
              specs: {},
              sourceUrl: pdpUrl,
              imageUrls: [],
              documents: [],
              pricing: { dealer: dealerCost },
            });
            matched++;
          }
        }

        if ((i + 1) % 10 === 0) log(`  portal: visited ${i + 1}/${portalLinks.length}`);
      } catch (err) {
        log(`  portal: PDP failed (${pdpUrl}):`, err?.message ?? err);
      }
      // Jitter delay between requests
      await page.waitForTimeout(500 + Math.random() * 500);
    }

    log(`portal: matched ${matched} products with dealer pricing, ${noPrice} had no price`);
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
