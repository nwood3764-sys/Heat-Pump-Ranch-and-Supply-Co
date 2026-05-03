/**
 * ACiQ portal scraper — Pure REST API approach.
 *
 * NO Playwright / NO browser needed. Strategy:
 *
 *   1. Solve reCAPTCHA v2 via 2Captcha (site key is known/hardcoded)
 *   2. POST /rest/V1/integration/customer/token with credentials +
 *      X-ReCaptcha header → get bearer token
 *   3. GET /rest/V1/products with bearer token → paginate all products
 *      as structured JSON with dealer pricing
 *
 * This eliminates all Breeze theme / Knockout / lazy-loading issues.
 *
 * Required env:
 *   ACIQ_PORTAL_USERNAME / ACIQ_PORTAL_PASSWORD
 *   TWOCAPTCHA_API_KEY
 */

import { solveRecaptchaV2 } from "./captcha-solver.mjs";

const BASE = "https://portal.aciq.com";
const KNOWN_SITE_KEY = "6LdjQEcpAAAAAKMZu6LAY9eAHLZQl-xZdLXvTz96";
const LOGIN_URL = `${BASE}/customer/account/login/`;
const TOKEN_ENDPOINT = `${BASE}/rest/V1/integration/customer/token`;
const PRODUCTS_ENDPOINT = `${BASE}/rest/V1/products`;
const MAX_CAPTCHA_RETRIES = 3;
const PAGE_SIZE = 100;

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
/*  GET CUSTOMER TOKEN VIA REST API                                    */
/* ------------------------------------------------------------------ */

async function getCustomerToken(username, password, log) {
  for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
    // Solve CAPTCHA
    let captchaToken;
    try {
      log(`portal-api: solving reCAPTCHA v2 (attempt ${attempt}/${MAX_CAPTCHA_RETRIES})...`);
      captchaToken = await solveRecaptchaV2(KNOWN_SITE_KEY, LOGIN_URL, { log });
      log(`portal-api: CAPTCHA solved (token length=${captchaToken.length})`);
    } catch (err) {
      if (attempt < MAX_CAPTCHA_RETRIES && /UNSOLVABLE|ERROR/i.test(err.message)) {
        log(`portal-api: CAPTCHA attempt ${attempt} failed (${err.message}), retrying...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }

    // Request customer token
    log("portal-api: requesting customer token via REST API...");
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ReCaptcha": captchaToken,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({ username, password }),
    });

    const body = await res.text();

    if (res.ok) {
      // Token is returned as a JSON string (with quotes)
      const token = body.replace(/^"|"$/g, "");
      log(`portal-api: customer token obtained (length=${token.length})`);
      return token;
    }

    // Check if it's a CAPTCHA failure (might need fresh solve)
    if (body.includes("ReCaptcha validation failed") && attempt < MAX_CAPTCHA_RETRIES) {
      log(`portal-api: CAPTCHA token rejected by server (attempt ${attempt}), retrying with fresh solve...`);
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    // Check for invalid credentials
    if (res.status === 401) {
      throw new Error(`Portal login failed: invalid credentials. Response: ${body}`);
    }

    throw new Error(`Portal token request failed: HTTP ${res.status} — ${body}`);
  }

  throw new Error("Failed to obtain customer token after all retries");
}

/* ------------------------------------------------------------------ */
/*  FETCH ALL PRODUCTS VIA REST API                                    */
/* ------------------------------------------------------------------ */

async function fetchAllProducts(bearerToken, log) {
  const allProducts = [];
  let currentPage = 1;
  let totalCount = null;

  while (true) {
    const url = `${PRODUCTS_ENDPOINT}?` +
      `searchCriteria[pageSize]=${PAGE_SIZE}&` +
      `searchCriteria[currentPage]=${currentPage}`;

    log(`portal-api: fetching page ${currentPage}${totalCount ? ` (${allProducts.length}/${totalCount})` : ""}...`);

    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (HeatPumpRanchBot/1.0)",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401) {
        log(`portal-api: got 401 — customer token may not have product API access`);
        log(`portal-api: response: ${body.slice(0, 200)}`);
        return null; // Signal that API approach won't work
      }
      log(`portal-api: HTTP ${res.status} on page ${currentPage}: ${body.slice(0, 200)}`);
      break;
    }

    const data = await res.json();

    if (totalCount === null) {
      totalCount = data.total_count ?? data.items?.length ?? 0;
      log(`portal-api: total products available: ${totalCount}`);
    }

    const items = data.items ?? [];
    if (items.length === 0) break;

    allProducts.push(...items);

    if (allProducts.length >= totalCount) break;
    currentPage++;

    // Polite delay
    await new Promise(r => setTimeout(r, 200));
  }

  log(`portal-api: fetched ${allProducts.length} products total`);
  return allProducts;
}

/* ------------------------------------------------------------------ */
/*  CONVERT API ITEMS TO LISTING ENTRIES                               */
/* ------------------------------------------------------------------ */

function apiItemsToEntries(items) {
  return items.map(item => {
    const sku = item.sku ?? null;
    const title = item.name ?? "";
    const regularPrice = item.price ?? null;

    // Magento uses special_price for dealer/sale pricing
    const attrs = item.custom_attributes ?? [];
    const getAttr = (code) => attrs.find(a => a.attribute_code === code)?.value ?? null;

    const specialPrice = getAttr("special_price");
    const urlKey = getAttr("url_key");
    const image = getAttr("image");

    const url = urlKey ? `${BASE}/${urlKey}.html` : `${BASE}/catalog/product/view/id/${item.id}`;
    const thumbnailUrl = image ? `${BASE}/media/catalog/product${image}` : null;

    return {
      sourceId: `portal_${item.id}`,
      url,
      title,
      modelLine: sku,
      oldPrice: regularPrice ? Number(regularPrice) : null,
      salePrice: specialPrice ? Number(specialPrice) : (regularPrice ? Number(regularPrice) : null),
      thumbnailUrl,
      from: "aciq-portal",
      sku,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  FALLBACK: SESSION-COOKIE BASED FETCH (for detail pages)            */
/* ------------------------------------------------------------------ */

async function getSessionCookies(username, password, captchaToken, log) {
  // Use the loginPost form endpoint to get session cookies
  const jar = new CookieJar();

  // First, get a PHPSESSID by visiting the login page
  const loginPageRes = await fetch(`${BASE}/customer/account/login/`, {
    redirect: "manual",
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  jar.ingest(loginPageRes.headers.getSetCookie?.() ?? loginPageRes.headers.raw?.()?.["set-cookie"]);

  // Submit login form
  const formData = new URLSearchParams();
  formData.set("login[username]", username);
  formData.set("login[password]", password);
  formData.set("g-recaptcha-response", captchaToken);
  formData.set("send", "");

  const loginRes = await fetch(`${BASE}/customer/account/loginPost/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": jar.toHeader(),
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    body: formData.toString(),
    redirect: "manual",
  });
  jar.ingest(loginRes.headers.getSetCookie?.() ?? loginRes.headers.raw?.()?.["set-cookie"]);

  // Follow redirect
  const location = loginRes.headers.get("location");
  if (location) {
    const followRes = await fetch(location, {
      headers: {
        "Cookie": jar.toHeader(),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      redirect: "manual",
    });
    jar.ingest(followRes.headers.getSetCookie?.() ?? followRes.headers.raw?.()?.["set-cookie"]);
  }

  log(`portal-api: session cookies obtained (${jar.cookies.size} cookies)`);
  return jar;
}

/* ------------------------------------------------------------------ */
/*  PUBLIC API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Full portal scrape via REST API.
 * Returns { jar, entries } — same shape as before for backward compat.
 */
export async function scrapePortalPlaywright(username, password, { log = () => {} } = {}) {
  if (!username || !password) {
    throw new Error("scrapePortalPlaywright requires username and password");
  }

  // Step 1: Get customer bearer token (solves CAPTCHA internally)
  const bearerToken = await getCustomerToken(username, password, log);

  // Step 2: Fetch all products via REST API
  log("portal-api: fetching products via Magento REST API...");
  const apiProducts = await fetchAllProducts(bearerToken, log);

  if (apiProducts === null) {
    // API returned 401 — customer tokens may not have product access.
    // Try session-cookie approach with the same CAPTCHA token.
    log("portal-api: bearer token lacks product API access, trying session cookie approach...");

    // Solve CAPTCHA again for form login
    const captchaToken = await solveRecaptchaV2(KNOWN_SITE_KEY, LOGIN_URL, { log });
    const jar = await getSessionCookies(username, password, captchaToken, log);

    // Try API with session cookie instead of bearer token
    const cookieHeader = jar.toHeader();
    const res = await fetch(`${PRODUCTS_ENDPOINT}?searchCriteria[pageSize]=1`, {
      headers: {
        "Cookie": cookieHeader,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (HeatPumpRanchBot/1.0)",
      },
    });

    if (res.ok) {
      log("portal-api: session cookie works for API, fetching all products...");
      // Re-fetch with session cookies
      const allProducts = [];
      let currentPage = 1;
      let totalCount = null;

      while (true) {
        const url = `${PRODUCTS_ENDPOINT}?searchCriteria[pageSize]=${PAGE_SIZE}&searchCriteria[currentPage]=${currentPage}`;
        const pageRes = await fetch(url, {
          headers: {
            "Cookie": cookieHeader,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (HeatPumpRanchBot/1.0)",
          },
        });
        if (!pageRes.ok) break;
        const data = await pageRes.json();
        if (totalCount === null) {
          totalCount = data.total_count ?? 0;
          log(`portal-api: total products: ${totalCount}`);
        }
        const items = data.items ?? [];
        if (items.length === 0) break;
        allProducts.push(...items);
        if (allProducts.length >= totalCount) break;
        currentPage++;
        await new Promise(r => setTimeout(r, 200));
      }

      const entries = apiItemsToEntries(allProducts);
      log(`portal-api: ${entries.length} entries from session-cookie API`);
      return { jar, entries };
    }

    log("portal-api: session cookie also lacks API access — returning empty");
    return { jar, entries: [] };
  }

  // Step 3: Convert to entries
  const entries = apiItemsToEntries(apiProducts);
  log(`portal-api: converted ${entries.length} products to entries`);

  // Create a jar with a dummy session for backward compat with detail fetcher
  const jar = new CookieJar();
  return { jar, entries };
}

/**
 * Backward-compatible login-only export.
 */
export async function loginWithPlaywright(username, password, { log = () => {} } = {}) {
  log("portal-api: loginWithPlaywright called — using API token approach");
  const captchaToken = await solveRecaptchaV2(KNOWN_SITE_KEY, LOGIN_URL, { log });
  const jar = await getSessionCookies(username, password, captchaToken, log);
  return jar;
}
