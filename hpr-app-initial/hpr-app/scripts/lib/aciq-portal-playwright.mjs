/**
 * ACiQ portal scraper — Session-cookie + REST API approach.
 *
 * NO Playwright / NO browser needed. Strategy:
 *
 *   1. Solve reCAPTCHA v2 via 2Captcha (site key is known/hardcoded)
 *   2. POST /customer/account/loginPost/ with form data + CAPTCHA token
 *      → get authenticated session cookies
 *   3. GET /rest/V1/products with session cookies → paginated JSON
 *      with dealer pricing
 *
 * The bearer token approach failed because Magento validates the
 * reCAPTCHA token against the page URL, and the REST API endpoint
 * URL doesn't match the login page URL we solved for.
 *
 * The form-based login works because the CAPTCHA IS solved for the
 * login page URL.
 *
 * Required env:
 *   ACIQ_PORTAL_USERNAME / ACIQ_PORTAL_PASSWORD
 *   TWOCAPTCHA_API_KEY
 */

import { solveRecaptchaV2 } from "./captcha-solver.mjs";

const BASE = "https://portal.aciq.com";
const KNOWN_SITE_KEY = "6LdjQEcpAAAAAKMZu6LAY9eAHLZQl-xZdLXvTz96";
const LOGIN_URL = `${BASE}/customer/account/login/`;
const LOGIN_POST_URL = `${BASE}/customer/account/loginPost/`;
const PRODUCTS_ENDPOINT = `${BASE}/rest/V1/products`;
const MAX_CAPTCHA_RETRIES = 3;
const PAGE_SIZE = 100;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/* ------------------------------------------------------------------ */
/*  CookieJar                                                          */
/* ------------------------------------------------------------------ */
class CookieJar {
  constructor() { this.cookies = new Map(); }
  ingest(res) {
    // Node 18+ has getSetCookie(); older has raw()
    const headers = typeof res.headers?.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : (res.headers?.raw?.()?.["set-cookie"] ?? []);
    for (const sc of headers) {
      const first = sc.split(";")[0];
      const eq = first.indexOf("=");
      if (eq < 0) continue;
      this.cookies.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
    }
  }
  toHeader() { return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; "); }
  has(name) { return this.cookies.has(name); }
  size() { return this.cookies.size; }
}

/* ------------------------------------------------------------------ */
/*  FORM-BASED LOGIN → SESSION COOKIES                                 */
/* ------------------------------------------------------------------ */

async function loginViaForm(username, password, log) {
  for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
    // Solve CAPTCHA
    let captchaToken;
    try {
      log(`portal: solving reCAPTCHA v2 (attempt ${attempt}/${MAX_CAPTCHA_RETRIES})...`);
      captchaToken = await solveRecaptchaV2(KNOWN_SITE_KEY, LOGIN_URL, { log });
      log(`portal: CAPTCHA solved (token length=${captchaToken.length})`);
    } catch (err) {
      if (attempt < MAX_CAPTCHA_RETRIES && /UNSOLVABLE|ERROR/i.test(err.message)) {
        log(`portal: CAPTCHA attempt ${attempt} failed (${err.message}), retrying...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }

    const jar = new CookieJar();

    // Step 1: Visit login page to get PHPSESSID + form_key
    log("portal: fetching login page for session cookie...");
    const loginPageRes = await fetch(LOGIN_URL, {
      redirect: "manual",
      headers: { "User-Agent": UA },
    });
    jar.ingest(loginPageRes);

    // Extract form_key from the HTML (Magento CSRF token)
    const loginHtml = await loginPageRes.text();
    const formKeyMatch = loginHtml.match(/name="form_key"\s+(?:type="hidden"\s+)?value="([^"]+)"/);
    const formKey = formKeyMatch?.[1] ?? "";
    if (formKey) {
      log(`portal: extracted form_key (${formKey.slice(0, 8)}...)`);
    } else {
      log("portal: WARNING — could not extract form_key from login page");
    }

    // Step 2: POST login form
    log("portal: submitting login form...");
    const formData = new URLSearchParams();
    if (formKey) formData.set("form_key", formKey);
    formData.set("login[username]", username);
    formData.set("login[password]", password);
    formData.set("g-recaptcha-response", captchaToken);
    formData.set("send", "");

    const loginRes = await fetch(LOGIN_POST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": jar.toHeader(),
        "User-Agent": UA,
        "Referer": LOGIN_URL,
        "Origin": BASE,
      },
      body: formData.toString(),
      redirect: "manual",
    });
    jar.ingest(loginRes);

    const status = loginRes.status;
    const location = loginRes.headers.get("location") ?? "";

    log(`portal: login response: HTTP ${status}, redirect to: ${location || "(none)"}`);

    // Follow redirect(s) to complete login
    if (location) {
      const followRes = await fetch(location, {
        headers: { "Cookie": jar.toHeader(), "User-Agent": UA },
        redirect: "manual",
      });
      jar.ingest(followRes);

      // Check if we landed on the account dashboard (success) or back on login (failure)
      const followLocation = followRes.headers.get("location") ?? "";
      const followBody = await followRes.text();

      if (followLocation.includes("/customer/account/login") ||
          followBody.includes("Invalid login") ||
          followBody.includes("ReCaptcha validation failed")) {
        log(`portal: login attempt ${attempt} rejected (redirected back to login or CAPTCHA failed)`);
        if (attempt < MAX_CAPTCHA_RETRIES) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        throw new Error("Portal login failed after all retries");
      }
    }

    // Verify we're logged in by checking the account page
    const accountRes = await fetch(`${BASE}/customer/account/`, {
      headers: { "Cookie": jar.toHeader(), "User-Agent": UA },
      redirect: "manual",
    });
    jar.ingest(accountRes);

    const accountStatus = accountRes.status;
    const accountLocation = accountRes.headers.get("location") ?? "";

    if (accountStatus === 302 && accountLocation.includes("login")) {
      log(`portal: login verification failed — redirected to login (attempt ${attempt})`);
      if (attempt < MAX_CAPTCHA_RETRIES) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw new Error("Portal login failed — could not verify session");
    }

    log(`portal: login successful! (${jar.size()} cookies)`);
    return jar;
  }

  throw new Error("Failed to login after all retries");
}

/* ------------------------------------------------------------------ */
/*  FETCH PRODUCTS VIA REST API WITH SESSION COOKIES                   */
/* ------------------------------------------------------------------ */

async function fetchProductsWithCookies(jar, log) {
  const cookieHeader = jar.toHeader();

  // Test if the API is accessible with session cookies
  log("portal: testing REST API access with session cookies...");
  const testRes = await fetch(`${PRODUCTS_ENDPOINT}?searchCriteria[pageSize]=1`, {
    headers: {
      "Cookie": cookieHeader,
      "Accept": "application/json",
      "User-Agent": UA,
    },
  });

  if (!testRes.ok) {
    const body = await testRes.text();
    log(`portal: REST API returned HTTP ${testRes.status}: ${body.slice(0, 200)}`);
    return null;
  }

  const testData = await testRes.json();
  const totalCount = testData.total_count ?? 0;
  log(`portal: REST API accessible — ${totalCount} total products available`);

  if (totalCount === 0) return [];

  // Paginate through all products
  const allProducts = [];
  let currentPage = 1;

  while (allProducts.length < totalCount) {
    const url = `${PRODUCTS_ENDPOINT}?` +
      `searchCriteria[pageSize]=${PAGE_SIZE}&` +
      `searchCriteria[currentPage]=${currentPage}`;

    log(`portal: fetching page ${currentPage} (${allProducts.length}/${totalCount})...`);

    const res = await fetch(url, {
      headers: {
        "Cookie": cookieHeader,
        "Accept": "application/json",
        "User-Agent": UA,
      },
    });

    if (!res.ok) {
      log(`portal: HTTP ${res.status} on page ${currentPage}, stopping pagination`);
      break;
    }

    const data = await res.json();
    const items = data.items ?? [];
    if (items.length === 0) break;

    allProducts.push(...items);
    currentPage++;

    // Polite delay
    await new Promise(r => setTimeout(r, 300));
  }

  log(`portal: fetched ${allProducts.length} products total`);
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
/*  FALLBACK: SCRAPE CATEGORY PAGES WITH SESSION COOKIES               */
/* ------------------------------------------------------------------ */

async function scrapeWithCookies(jar, log) {
  const { default: cheerio } = await import("cheerio");
  const cookieHeader = jar.toHeader();

  // Discover categories from the nav
  log("portal: falling back to HTML scraping with session cookies...");
  const homeRes = await fetch(BASE, {
    headers: { "Cookie": cookieHeader, "User-Agent": UA },
  });
  const homeHtml = await homeRes.text();
  const $ = cheerio.load(homeHtml);

  const categoryUrls = new Set();
  $('a[href*="/catalog/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.startsWith(BASE)) categoryUrls.add(href);
  });
  // Also check for standard Magento category links
  $('a[href]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.startsWith(BASE) && !href.includes("/customer/") &&
        !href.includes("/checkout/") && !href.includes("/cms/") &&
        !href.includes(".html") && href !== BASE && href !== BASE + "/") {
      categoryUrls.add(href.replace(/\/$/, ""));
    }
  });

  log(`portal: discovered ${categoryUrls.size} category URLs`);

  const allEntries = [];
  for (const catUrl of categoryUrls) {
    let page = 1;
    while (true) {
      const url = page === 1 ? catUrl : `${catUrl}?p=${page}`;
      const res = await fetch(url, {
        headers: { "Cookie": cookieHeader, "User-Agent": UA },
      });
      const html = await res.text();
      const $$ = cheerio.load(html);

      const products = $$(".product-item, .product-items .item, [data-product-id]");
      if (products.length === 0) break;

      products.each((_, el) => {
        const $el = $$(el);
        const link = $el.find("a.product-item-link, a.product-item-photo").first();
        const title = link.text().trim() || $el.find(".product-item-name").text().trim();
        const href = link.attr("href") ?? "";
        const priceText = $el.find(".price").first().text().replace(/[^0-9.]/g, "");
        const price = priceText ? Number(priceText) : null;
        const sku = $el.attr("data-product-sku") ?? null;

        if (title && href) {
          allEntries.push({
            sourceId: `portal_html_${href}`,
            url: href,
            title,
            modelLine: sku,
            oldPrice: null,
            salePrice: price,
            thumbnailUrl: null,
            from: "aciq-portal",
            sku,
          });
        }
      });

      // Check for next page
      const nextPage = $$('a.action.next, a[title="Next"]').attr("href");
      if (!nextPage) break;
      page++;
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Dedupe by URL
  const seen = new Set();
  const unique = allEntries.filter(e => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });

  log(`portal: scraped ${unique.length} unique products from HTML`);
  return unique;
}

/* ------------------------------------------------------------------ */
/*  PUBLIC API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Full portal scrape.
 * Returns { jar, entries } for backward compat with sync-aciq.mjs.
 */
export async function scrapePortalPlaywright(username, password, { log = () => {} } = {}) {
  if (!username || !password) {
    throw new Error("scrapePortalPlaywright requires username and password");
  }

  // Step 1: Login via form POST → session cookies
  const jar = await loginViaForm(username, password, log);

  // Step 2: Try REST API with session cookies (best: structured JSON)
  const apiProducts = await fetchProductsWithCookies(jar, log);

  if (apiProducts !== null && apiProducts.length > 0) {
    const entries = apiItemsToEntries(apiProducts);
    log(`portal: ${entries.length} entries from REST API`);
    return { jar, entries };
  }

  // Step 3: Fallback — scrape HTML category pages with session cookies
  log("portal: REST API unavailable or empty, falling back to HTML scrape...");
  const entries = await scrapeWithCookies(jar, log);
  return { jar, entries };
}

/**
 * Backward-compatible login-only export.
 */
export async function loginWithPlaywright(username, password, { log = () => {} } = {}) {
  return loginViaForm(username, password, log);
}
