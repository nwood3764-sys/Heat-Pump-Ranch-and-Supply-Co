/**
 * ACiQ portal scraper — Playwright login + Magento REST API.
 *
 * Strategy:
 *   1. Login via Playwright (handles reCAPTCHA via 2Captcha with retry)
 *   2. Extract PHPSESSID session cookie
 *   3. Use session cookie with Magento 2 REST API to fetch all products
 *      as JSON — no HTML scraping, no client-side rendering issues
 *
 * The REST API returns structured product data including SKU, name,
 * pricing (special_price = dealer cost, price = MSRP), and all
 * custom attributes.
 *
 * Required env:
 *   ACIQ_PORTAL_USERNAME / ACIQ_PORTAL_PASSWORD
 *   TWOCAPTCHA_API_KEY (for CAPTCHA solving)
 */

import { chromium } from "playwright";
import { solveRecaptchaV2, solveRecaptchaV3, extractRecaptchaSiteKey } from "./captcha-solver.mjs";

const BASE = "https://portal.aciq.com";
const MAX_CAPTCHA_RETRIES = 3;

/* ------------------------------------------------------------------ */
/*  CookieJar — for backward compat with fetchPortalProductDetail      */
/* ------------------------------------------------------------------ */
class CookieJar {
  constructor() { this.cookies = new Map(); }
  ingest(setCookieHeaders) {
    if (!setCookieHeaders) return;
    const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const sc of list) {
      const first = sc.split(";")[0];
      const eq = first.indexOf("=");
      if (eq < 0) continue;
      this.cookies.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
    }
  }
  toHeader() { return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; "); }
  has(name) { return this.cookies.has(name); }
}

/* ------------------------------------------------------------------ */
/*  CAPTCHA SOLVING WITH RETRY                                         */
/* ------------------------------------------------------------------ */

async function solveCaptchaWithRetry(page, log) {
  // Try static HTML first
  const pageContent = await page.content();
  let siteKey = extractRecaptchaSiteKey(pageContent);

  // Trigger lazy reCAPTCHA by interacting with the form
  if (!siteKey) {
    log("portal-pw: triggering lazy reCAPTCHA via form interaction...");
    const emailField = await page.$('#email, input[type="email"]');
    if (emailField) {
      await emailField.click();
      await page.waitForTimeout(2000);
    }
    await page.waitForSelector(
      'script[src*="google.com/recaptcha"], script[src*="gstatic.com/recaptcha"]',
      { timeout: 15_000 }
    ).catch(() => {});
    await page.waitForTimeout(3000);

    siteKey = await page.evaluate(() => {
      const el = document.querySelector('[data-sitekey]');
      if (el) return el.getAttribute('data-sitekey');
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        if (iframe.src && iframe.src.includes('recaptcha')) {
          const m = iframe.src.match(/[?&]k=([A-Za-z0-9_-]{40})/);
          if (m) return m[1];
        }
      }
      return null;
    });
  }

  if (!siteKey) {
    throw new Error("reCAPTCHA detected but could not extract site key");
  }

  log(`portal-pw: extracted site key: ${siteKey.slice(0, 20)}...`);

  // Determine type
  const isV3 = pageContent.includes("recaptcha/api.js?render=") &&
               !pageContent.includes('class="g-recaptcha"');

  // Solve with retry
  for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
    try {
      let token;
      if (isV3) {
        log(`portal-pw: solving reCAPTCHA v3 (attempt ${attempt}/${MAX_CAPTCHA_RETRIES})`);
        token = await solveRecaptchaV3(siteKey, `${BASE}/customer/account/login/`, { action: "login", log });
      } else {
        log(`portal-pw: solving reCAPTCHA v2 (attempt ${attempt}/${MAX_CAPTCHA_RETRIES})`);
        token = await solveRecaptchaV2(siteKey, `${BASE}/customer/account/login/`, { log });
      }
      log(`portal-pw: CAPTCHA solved (token length=${token.length})`);
      return token;
    } catch (err) {
      if (attempt < MAX_CAPTCHA_RETRIES && /UNSOLVABLE|ERROR/i.test(err.message)) {
        log(`portal-pw: CAPTCHA attempt ${attempt} failed (${err.message}), retrying...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  LOGIN                                                              */
/* ------------------------------------------------------------------ */

async function doLogin(page, username, password, log) {
  log("portal-pw: navigating to login page");
  await page.goto(`${BASE}/customer/account/login/`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

  const hasCaptcha = await page.evaluate(() => {
    return !!(
      document.querySelector('script[src*="recaptcha"]') ||
      document.querySelector("div.g-recaptcha") ||
      document.querySelector("[class*=captcha]") ||
      document.querySelector('textarea[name="g-recaptcha-response"]')
    );
  });

  if (hasCaptcha) {
    log("portal-pw: reCAPTCHA detected, solving...");
    const captchaToken = await solveCaptchaWithRetry(page, log);

    // Inject token
    await page.evaluate((token) => {
      document.querySelectorAll('textarea[name="g-recaptcha-response"]').forEach(ta => { ta.value = token; });
      const forms = document.querySelectorAll('form[action*="loginPost"], #login-form');
      forms.forEach(form => {
        let input = form.querySelector('input[name="g-recaptcha-response"]');
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = "g-recaptcha-response";
          form.appendChild(input);
        }
        input.value = token;
      });
      if (window.grecaptcha && window.grecaptcha.getResponse) {
        window.grecaptcha.getResponse = () => token;
      }
    }, captchaToken);
  }

  // Fill and submit — the CAPTCHA solving may have changed page state,
  // so we re-navigate to the login page with the solved token ready.
  // The session already has the CAPTCHA solution stored.
  log("portal-pw: filling login form");
  
  // Ensure the form fields are visible and interactable
  await page.waitForTimeout(1000);
  
  // Try to find the email field; if not found, reload the page
  let emailField = await page.$('#email');
  if (!emailField) {
    log("portal-pw: email field not found, reloading login page...");
    await page.goto(`${BASE}/customer/account/login/`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  }
  
  await page.waitForSelector('#email', { timeout: 15_000 });
  // Click the field first to ensure it's focused and the Breeze theme has initialized it
  await page.click('#email');
  await page.waitForTimeout(500);
  await page.fill('#email', username);
  await page.click('#pass');
  await page.waitForTimeout(500);
  await page.fill('#pass', password);

  log("portal-pw: submitting login form");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {}),
    page.click('#send2'),
  ]);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  // Verify
  const finalContent = await page.content();
  const matched = [/\bLog ?Out\b/i, /\bSign Out\b/i, /Welcome,\s*[A-Z]/, /\bMy Account\b/i]
    .find(re => re.test(finalContent));
  if (!matched) {
    const errorText = await page.evaluate(() =>
      document.querySelector(".message-error, .messages .error")?.textContent?.trim() ?? null
    );
    throw new Error(`Login failed. Error: ${errorText || "no auth markers found"}`);
  }
  log(`portal-pw: login successful (matched: ${matched.source})`);
}

/* ------------------------------------------------------------------ */
/*  REST API PRODUCT FETCHING                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch all products from the Magento REST API using session cookies.
 * Paginates through /rest/V1/products in batches of 100.
 */
async function fetchProductsViaApi(cookieHeader, log) {
  const PAGE_SIZE = 100;
  const allProducts = [];
  let currentPage = 1;
  let totalCount = null;

  while (true) {
    const url = `${BASE}/rest/V1/products?` +
      `searchCriteria[pageSize]=${PAGE_SIZE}&` +
      `searchCriteria[currentPage]=${currentPage}`;

    log(`portal-api: fetching page ${currentPage}${totalCount ? ` (${allProducts.length}/${totalCount})` : ""}...`);

    const res = await fetch(url, {
      headers: {
        "Cookie": cookieHeader,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (HeatPumpRanchBot/1.0)",
      },
    });

    if (!res.ok) {
      // If we get 401, the session may have expired or the API isn't
      // accessible with customer session cookies. Fall back.
      if (res.status === 401) {
        log(`portal-api: got 401 on page ${currentPage} — API may require admin token, falling back to page scraping`);
        return null; // Signal to caller to fall back
      }
      log(`portal-api: HTTP ${res.status} on page ${currentPage}, stopping`);
      break;
    }

    const data = await res.json();

    if (totalCount === null) {
      totalCount = data.total_count ?? data.items?.length ?? 0;
      log(`portal-api: total products available: ${totalCount}`);
    }

    const items = data.items ?? [];
    if (items.length === 0) break;

    for (const item of items) {
      allProducts.push(item);
    }

    if (allProducts.length >= totalCount) break;
    currentPage++;

    // Polite delay
    await new Promise(r => setTimeout(r, 200));
  }

  log(`portal-api: fetched ${allProducts.length} products via REST API`);
  return allProducts;
}

/**
 * Convert Magento REST API product items into the same entry shape
 * that the rest of the sync pipeline expects.
 */
function apiItemsToEntries(items) {
  return items.map(item => {
    const sku = item.sku ?? null;
    const title = item.name ?? "";
    const regularPrice = item.price ?? null;

    // Magento uses special_price for dealer/sale pricing
    const specialPrice = item.custom_attributes?.find(a => a.attribute_code === "special_price")?.value
      ?? null;

    // Get the product URL key
    const urlKey = item.custom_attributes?.find(a => a.attribute_code === "url_key")?.value ?? null;
    const url = urlKey ? `${BASE}/${urlKey}.html` : `${BASE}/catalog/product/view/id/${item.id}`;

    // Image
    const image = item.custom_attributes?.find(a => a.attribute_code === "image")?.value ?? null;
    const thumbnailUrl = image ? `${BASE}/media/catalog/product${image}` : null;

    return {
      sourceId: `portal_${item.id}`,
      url,
      title,
      modelLine: sku, // SKU is typically the model number
      oldPrice: regularPrice ? Number(regularPrice) : null,
      salePrice: specialPrice ? Number(specialPrice) : (regularPrice ? Number(regularPrice) : null),
      thumbnailUrl,
      from: "aciq-portal",
      sku, // Pass through for merge
    };
  });
}

/* ------------------------------------------------------------------ */
/*  FALLBACK: PLAYWRIGHT PAGE SCRAPING                                 */
/* ------------------------------------------------------------------ */

async function extractProductsFromPage(page) {
  return page.evaluate(() => {
    const products = [];
    const items = document.querySelectorAll('li.product-item, .product-item, .products-grid .item');
    for (const item of items) {
      const linkEl = item.querySelector('a.product-item-link, a.product-item-photo');
      const url = linkEl?.getAttribute("href") ?? null;
      if (!url) continue;
      const title = item.querySelector('a.product-item-link, .product-item-name a')?.textContent?.trim() ?? "";
      let sourceId = item.querySelector('.product-item-info')?.id?.replace(/^product-item-info_/, "") ?? null;
      if (!sourceId) sourceId = item.querySelector('[data-product-id]')?.getAttribute('data-product-id') ?? null;
      if (!sourceId && url) sourceId = url.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80);
      const oldAmt = item.querySelector('[data-price-type="oldPrice"]')?.getAttribute("data-price-amount");
      const saleAmt = item.querySelector('[data-price-type="finalPrice"], [id^="product-price-"]')?.getAttribute("data-price-amount");
      let textPrice = null;
      if (!saleAmt) {
        const priceEl = item.querySelector('.price');
        if (priceEl) {
          const m = priceEl.textContent.match(/\$?([\d,]+\.?\d*)/);
          if (m) textPrice = parseFloat(m[1].replace(/,/g, ""));
        }
      }
      const imgSrc = item.querySelector('img.product-image-photo, img')?.getAttribute("src") ?? null;
      products.push({
        sourceId: `portal_${sourceId}`,
        url: url.startsWith("http") ? url : `${window.location.origin}${url}`,
        title,
        modelLine: null,
        oldPrice: oldAmt ? Number(oldAmt) : null,
        salePrice: saleAmt ? Number(saleAmt) : (textPrice ?? null),
        thumbnailUrl: imgSrc,
        from: "aciq-portal",
      });
    }
    return products;
  });
}

async function discoverAndWalkCategories(page, log) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  const urls = await page.evaluate((base) => {
    const result = new Set();
    for (const a of document.querySelectorAll('nav.navigation a, .nav-sections a, header a')) {
      let href = a.getAttribute("href");
      if (!href) continue;
      if (!href.startsWith(base) && !href.startsWith("/")) continue;
      if (!href.endsWith(".html")) continue;
      if (/customer|checkout|cart|wishlist|search|contact/i.test(href)) continue;
      result.add(href.startsWith("http") ? href : `${base}${href}`);
    }
    return [...result];
  }, BASE);

  log(`portal-pw: discovered ${urls.length} category URLs`);

  const seen = new Map();
  for (const catUrl of urls) {
    try {
      await page.goto(catUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await page.waitForSelector('.product-item', { timeout: 10_000 }).catch(() => {});

      const products = await extractProductsFromPage(page);
      log(`  portal-pw: ${catUrl.split("/").pop()} → ${products.length} products`);
      for (const p of products) {
        if (!seen.has(p.sourceId)) seen.set(p.sourceId, p);
      }

      // Check for pagination
      let nextHref = await page.evaluate(() =>
        document.querySelector('a.action.next, .pages-item-next a')?.getAttribute("href") ?? null
      );
      let pageNum = 2;
      while (nextHref && pageNum <= 50) {
        await page.goto(nextHref.startsWith("http") ? nextHref : `${BASE}${nextHref}`, {
          waitUntil: "domcontentloaded", timeout: 30_000
        });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await page.waitForSelector('.product-item', { timeout: 10_000 }).catch(() => {});
        const moreProducts = await extractProductsFromPage(page);
        for (const p of moreProducts) {
          if (!seen.has(p.sourceId)) seen.set(p.sourceId, p);
        }
        if (moreProducts.length === 0) break;
        nextHref = await page.evaluate(() =>
          document.querySelector('a.action.next, .pages-item-next a')?.getAttribute("href") ?? null
        );
        pageNum++;
      }
    } catch (err) {
      log(`  portal-pw: ${catUrl.split("/").pop()} failed: ${err.message}`);
    }
  }

  log(`portal-pw: ${seen.size} unique products from page scraping`);
  return [...seen.values()];
}

/* ------------------------------------------------------------------ */
/*  PUBLIC API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Full portal scrape: login → try REST API → fall back to page scraping.
 * Returns { jar, entries }.
 */
export async function scrapePortalPlaywright(username, password, { log = () => {} } = {}) {
  if (!username || !password) {
    throw new Error("scrapePortalPlaywright requires username and password");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // Step 1: Login
    await doLogin(page, username, password, log);

    // Step 2: Extract cookies
    const jar = new CookieJar();
    const cookies = await context.cookies();
    for (const cookie of cookies) {
      if (cookie.domain.includes("aciq.com")) {
        jar.cookies.set(cookie.name, cookie.value);
      }
    }
    log(`portal-pw: extracted ${jar.cookies.size} session cookies`);
    const cookieHeader = jar.toHeader();

    // Step 3: Try REST API first (most reliable, structured JSON)
    log("portal-api: attempting Magento REST API product fetch...");
    const apiProducts = await fetchProductsViaApi(cookieHeader, log);

    if (apiProducts && apiProducts.length > 0) {
      // REST API worked — convert to entries
      const entries = apiItemsToEntries(apiProducts);
      log(`portal-api: converted ${entries.length} API products to entries`);
      return { jar, entries };
    }

    // Step 4: Fall back to Playwright page scraping
    log("portal-pw: REST API unavailable or returned 0, falling back to page scraping...");
    const entries = await discoverAndWalkCategories(page, log);
    return { jar, entries };
  } finally {
    await browser.close();
  }
}

/**
 * Backward-compatible login-only export.
 */
export async function loginWithPlaywright(username, password, { log = () => {} } = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await doLogin(page, username, password, log);
    const jar = new CookieJar();
    const cookies = await context.cookies();
    for (const cookie of cookies) {
      if (cookie.domain.includes("aciq.com")) {
        jar.cookies.set(cookie.name, cookie.value);
      }
    }
    log(`portal-pw: extracted ${jar.cookies.size} session cookies`);
    return jar;
  } finally {
    await browser.close();
  }
}
