/**
 * ACiQ portal FULL Playwright scraper.
 *
 * The portal (portal.aciq.com) uses the Breeze/Swissup Magento theme which
 * renders product listings client-side via Knockout/JS. Plain fetch + cheerio
 * cannot see the products. This module keeps a headless Chromium browser open
 * for the entire scrape:
 *
 *   1. Launch Playwright Chromium
 *   2. Navigate to login page, solve reCAPTCHA via 2Captcha
 *   3. Submit login form
 *   4. Discover category URLs from the rendered nav
 *   5. Walk each category page, extracting products from the rendered DOM
 *   6. Return listing entries (same shape as hvacdirect walker output)
 *
 * Required env:
 *   ACIQ_PORTAL_USERNAME / ACIQ_PORTAL_PASSWORD
 *   TWOCAPTCHA_API_KEY (for CAPTCHA solving)
 */

import { chromium } from "playwright";
import { solveRecaptchaV2, solveRecaptchaV3, extractRecaptchaSiteKey } from "./captcha-solver.mjs";

const BASE = "https://portal.aciq.com";

/* ------------------------------------------------------------------ */
/*  CookieJar — kept for backward compat with fetchPortalProductDetail */
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
/*  LOGIN                                                              */
/* ------------------------------------------------------------------ */

async function doLogin(page, username, password, log) {
  log("portal-pw: navigating to login page");
  await page.goto(`${BASE}/customer/account/login/`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

  // Detect CAPTCHA
  const hasCaptcha = await page.evaluate(() => {
    return !!(
      document.querySelector('script[src*="recaptcha"]') ||
      document.querySelector('script[src*="hcaptcha"]') ||
      document.querySelector("div.g-recaptcha") ||
      document.querySelector("[class*=captcha]") ||
      document.querySelector('input[name*="captcha"]') ||
      document.querySelector('textarea[name="g-recaptcha-response"]')
    );
  });

  let captchaToken = null;

  if (hasCaptcha) {
    log("portal-pw: reCAPTCHA detected, solving via 2Captcha...");

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

      // Wait for Google reCAPTCHA script to load
      await page.waitForSelector(
        'script[src*="google.com/recaptcha"], script[src*="gstatic.com/recaptcha"]',
        { timeout: 15_000 }
      ).catch(() => {});
      await page.waitForTimeout(3000);

      // Extract from rendered DOM
      siteKey = await page.evaluate(() => {
        const el = document.querySelector('[data-sitekey]');
        if (el) return el.getAttribute('data-sitekey');
        const iframes = document.querySelectorAll('iframe[src*="recaptcha"], iframe');
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

    // Determine type and solve
    const isV3 = pageContent.includes("recaptcha/api.js?render=") &&
                 !pageContent.includes('class="g-recaptcha"');
    if (isV3) {
      log("portal-pw: detected reCAPTCHA v3");
      captchaToken = await solveRecaptchaV3(siteKey, `${BASE}/customer/account/login/`, { action: "login", log });
    } else {
      log("portal-pw: detected reCAPTCHA v2");
      captchaToken = await solveRecaptchaV2(siteKey, `${BASE}/customer/account/login/`, { log });
    }

    log(`portal-pw: CAPTCHA solved (token length=${captchaToken.length})`);

    // Inject token
    await page.evaluate((token) => {
      document.querySelectorAll('textarea[name="g-recaptcha-response"]').forEach(ta => { ta.value = token; });
      const forms = document.querySelectorAll('form[action*="loginPost"], #login-form, form.form-login');
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

  // Fill and submit login form
  log("portal-pw: filling login form");
  await page.waitForSelector('#email, input[type="email"]', { timeout: 10_000 });
  await page.fill('#email, input[name="login[username]"], input[type="email"]', username);
  await page.fill('#pass, input[name="login[password]"], input[type="password"]', password);

  log("portal-pw: submitting login form");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {}),
    page.click('#send2'),
  ]);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  // Verify login
  const finalContent = await page.content();
  const successMarkers = [/\bLog ?Out\b/i, /\bSign Out\b/i, /Welcome,\s*[A-Z]/, /\bMy Account\b/i];
  const matched = successMarkers.find(re => re.test(finalContent));
  if (!matched) {
    const errorText = await page.evaluate(() => {
      const el = document.querySelector(".message-error, .messages .error");
      return el?.textContent?.trim() ?? null;
    });
    throw new Error(`Login failed. Error: ${errorText || "no auth markers found"}`);
  }
  log(`portal-pw: login successful (matched: ${matched.source})`);
}

/* ------------------------------------------------------------------ */
/*  CATEGORY DISCOVERY                                                 */
/* ------------------------------------------------------------------ */

async function discoverCategories(page, log) {
  // Navigate to homepage to get the full nav
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  const urls = await page.evaluate((base) => {
    const result = new Set();
    const links = document.querySelectorAll('nav.navigation a, .nav-sections a, ul.menu a, header a');
    for (const a of links) {
      let href = a.getAttribute("href");
      if (!href) continue;
      if (!href.startsWith(base) && !href.startsWith("/")) continue;
      if (!href.endsWith(".html")) continue;
      if (/customer|checkout|cart|wishlist|search|contact/i.test(href)) continue;
      const abs = href.startsWith("http") ? href : `${base}${href}`;
      result.add(abs);
    }
    return [...result];
  }, BASE);

  log(`portal-pw: discovered ${urls.length} category URLs from nav`);
  return urls;
}

/* ------------------------------------------------------------------ */
/*  PRODUCT EXTRACTION FROM RENDERED PAGE                              */
/* ------------------------------------------------------------------ */

async function extractProductsFromPage(page) {
  return page.evaluate(() => {
    const products = [];
    // Magento product list items — standard selectors that work across themes
    const items = document.querySelectorAll('li.product-item, .product-item, .products-grid .item');
    for (const item of items) {
      // Product URL
      const linkEl = item.querySelector('a.product-item-link, a.product-item-photo, a.product.photo');
      const url = linkEl?.getAttribute("href") ?? null;
      if (!url) continue;

      // Title
      const title = item.querySelector('a.product-item-link, .product-item-name a, .product-name a')?.textContent?.trim() ?? "";

      // Source ID
      const infoEl = item.querySelector('.product-item-info');
      let sourceId = infoEl?.id?.replace(/^product-item-info_/, "") ?? null;
      if (!sourceId) sourceId = item.querySelector('[data-product-id]')?.getAttribute('data-product-id') ?? null;
      if (!sourceId && url) sourceId = url.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80);

      // Pricing — look for data-price-amount attributes (Magento standard)
      const oldAmt = item.querySelector('[data-price-type="oldPrice"]')?.getAttribute("data-price-amount");
      const saleAmt = item.querySelector('[data-price-type="finalPrice"], [id^="product-price-"]')?.getAttribute("data-price-amount");

      // Also try text-based price extraction as fallback
      let textPrice = null;
      if (!saleAmt) {
        const priceEl = item.querySelector('.price, .special-price .price, .regular-price .price');
        if (priceEl) {
          const m = priceEl.textContent.match(/\$?([\d,]+\.?\d*)/);
          if (m) textPrice = parseFloat(m[1].replace(/,/g, ""));
        }
      }

      // Model line
      let modelLine = null;
      const spans = item.querySelectorAll('span, div');
      for (const sp of spans) {
        // Get direct text content (not children)
        const txt = sp.childNodes.length === 1 && sp.childNodes[0].nodeType === 3
          ? sp.textContent.trim()
          : "";
        if (txt.startsWith("Model:")) {
          modelLine = txt.replace(/^Model:\s*/, "").trim();
          break;
        }
      }

      // Image
      const imgSrc = item.querySelector('img.product-image-photo, img')?.getAttribute("src") ?? null;

      products.push({
        sourceId: `portal_${sourceId}`,
        url: url.startsWith("http") ? url : `${window.location.origin}${url}`,
        title,
        modelLine,
        oldPrice: oldAmt ? Number(oldAmt) : null,
        salePrice: saleAmt ? Number(saleAmt) : (textPrice ?? null),
        thumbnailUrl: imgSrc,
        from: "aciq-portal",
      });
    }
    return products;
  });
}

async function walkCategoryPw(page, startUrl, log) {
  const all = [];
  let url = startUrl;
  let pageNum = 1;
  const maxPages = 50;

  while (url && pageNum <= maxPages) {
    log(`  portal-pw page ${pageNum}: ${url}`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      // Extra wait for Breeze/Knockout to render product tiles
      await page.waitForTimeout(2000);
      // Also wait for product items to appear (up to 10s)
      await page.waitForSelector('.product-item, .products-grid .item', { timeout: 10_000 }).catch(() => {});
    } catch (err) {
      log(`  portal-pw page ${pageNum}: navigation error: ${err.message}`);
      break;
    }

    const products = await extractProductsFromPage(page);
    log(`  portal-pw page ${pageNum}: ${products.length} products`);
    all.push(...products);

    if (products.length === 0) break;

    // Check for next page link
    const nextHref = await page.evaluate(() => {
      const next = document.querySelector('a.action.next, .pages-item-next a, a[title="Next"]');
      return next?.getAttribute("href") ?? null;
    });

    if (!nextHref) break;
    url = nextHref.startsWith("http") ? nextHref : new URL(nextHref, url).toString();
    pageNum++;
    await page.waitForTimeout(500); // polite delay
  }

  return all;
}

/* ------------------------------------------------------------------ */
/*  PUBLIC API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Full Playwright-based portal scrape: login, discover categories,
 * walk each, return listing entries + a CookieJar for detail fetches.
 *
 * @returns {{ jar: CookieJar, entries: Array }}
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

    // Step 2: Extract cookies for detail-page fetches
    const jar = new CookieJar();
    const cookies = await context.cookies();
    for (const cookie of cookies) {
      if (cookie.domain.includes("aciq.com")) {
        jar.cookies.set(cookie.name, cookie.value);
      }
    }
    log(`portal-pw: extracted ${jar.cookies.size} session cookies`);

    // Step 3: Discover categories
    const categories = await discoverCategories(page, log);
    if (categories.length === 0) {
      categories.push(`${BASE}/brands/aciq-heating-cooling.html`);
    }

    // Step 4: Walk each category
    const seen = new Map();
    for (const catUrl of categories) {
      try {
        const entries = await walkCategoryPw(page, catUrl, log);
        for (const e of entries) {
          if (!seen.has(e.sourceId)) seen.set(e.sourceId, e);
        }
      } catch (err) {
        log(`portal-pw: walk ${catUrl} failed: ${err?.message ?? err}`);
      }
    }

    log(`portal-pw: ${seen.size} unique product entries across ${categories.length} categories`);
    return { jar, entries: [...seen.values()] };
  } finally {
    await browser.close();
  }
}

/**
 * Backward-compatible login-only export (used if aciq-portal.mjs
 * calls loginWithPlaywright directly).
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
    log(`portal-pw: extracted ${jar.cookies.size} session cookies: [${[...jar.cookies.keys()].join(",")}]`);
    return jar;
  } finally {
    await browser.close();
  }
}
