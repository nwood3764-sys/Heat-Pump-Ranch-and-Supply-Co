/**
 * ACiQ dealer portal (portal.aciq.com) scraper.
 *
 * portal.aciq.com is a Magento 2 storefront gated behind a customer
 * (dealer) login. Once authenticated, the same Magento listing/detail
 * page structure used by hvacdirect.com applies, so we reuse the cheerio
 * parsers from hvacdirect.mjs for product detail.
 *
 * Login flow (vanilla Magento 2):
 *   GET  /customer/account/login/        -> HTML containing a CSRF
 *                                          form_key in a hidden input
 *                                          and a Set-Cookie session id
 *   POST /customer/account/loginPost/    -> form-encoded body:
 *                                            form_key=<csrf>
 *                                            login[username]=<email>
 *                                            login[password]=<pw>
 *                                          On success: 302 to
 *                                          /customer/account/ (or similar)
 *                                          and an authenticated PHPSESSID
 *                                          cookie.
 *
 * After login, walk the brand/category index pages and collect listing
 * entries the same way hvacdirect does.
 */

import * as cheerio from "cheerio";
import { fetchProductDetail as fetchHvacdirectDetail, parseModelLine } from "./hvacdirect.mjs";

const BASE = "https://portal.aciq.com";
const UA = "Mozilla/5.0 (HeatPumpRanchBot/1.0; +https://heat-pump-ranch-and-supply-co.netlify.app)";

export const ACIQ_PORTAL_BASE = BASE;

/**
 * Minimal cookie jar. Native fetch does not auto-track Set-Cookie across
 * requests; this gives us just enough to keep a Magento session alive.
 *
 * Stores cookies as a flat name -> value map and serializes to a single
 * Cookie header on each request. Domain/path scoping is ignored because
 * we only ever talk to one origin (portal.aciq.com).
 */
class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  ingest(setCookieHeaders) {
    if (!setCookieHeaders) return;
    const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const sc of list) {
      // First "name=value" pair before the first ";"
      const first = sc.split(";")[0];
      const eq = first.indexOf("=");
      if (eq < 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }
  toHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  has(name) {
    return this.cookies.has(name);
  }
}

async function jarFetch(jar, url, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("user-agent", UA);
  if (jar.cookies.size > 0) headers.set("cookie", jar.toHeader());
  const res = await fetch(url, { ...init, headers, redirect: "manual" });
  // Node fetch exposes set-cookie via headers.getSetCookie() (Node 20+).
  // Fall back to .raw() if running older runtime.
  let setCookies = null;
  if (typeof res.headers.getSetCookie === "function") {
    setCookies = res.headers.getSetCookie();
  } else if (typeof res.headers.raw === "function") {
    setCookies = res.headers.raw()["set-cookie"];
  } else {
    const single = res.headers.get("set-cookie");
    setCookies = single ? [single] : null;
  }
  jar.ingest(setCookies);
  return res;
}

/**
 * Follow up-to-N redirects manually so we can keep the cookie jar in
 * sync at every hop.
 */
async function followRedirects(jar, url, init, max = 5) {
  let cur = url;
  let res = await jarFetch(jar, cur, init);
  let hops = 0;
  while ([301, 302, 303, 307, 308].includes(res.status) && hops < max) {
    const loc = res.headers.get("location");
    if (!loc) break;
    cur = loc.startsWith("http") ? loc : new URL(loc, cur).toString();
    // After the first redirect a 303 turns POST into GET; emulate that.
    const nextInit = res.status === 303
      ? { method: "GET" }
      : { method: init.method ?? "GET", body: init.method === "POST" ? init.body : undefined };
    res = await jarFetch(jar, cur, nextInit);
    hops++;
  }
  return res;
}

/**
 * Authenticate and return a CookieJar with the dealer session cookies.
 * Throws on failure.
 */
export async function loginToAciqPortal(username, password, { log = () => {} } = {}) {
  if (!username || !password) {
    throw new Error("loginToAciqPortal requires username and password");
  }
  const jar = new CookieJar();

  log(`portal: GET ${BASE}/customer/account/login/`);
  const loginPageRes = await followRedirects(jar, `${BASE}/customer/account/login/`, { method: "GET" });
  if (!loginPageRes.ok) {
    throw new Error(`login page returned ${loginPageRes.status}`);
  }
  const html = await loginPageRes.text();
  const $ = cheerio.load(html);

  // Magento 2 form layout: <form id="login-form" action="…/loginPost/">
  // with hidden <input name="form_key" value="…">. Some themes nest the
  // form inside an authentication popup; locate by action substring.
  const form =
    $('form[action*="customer/account/loginPost"]').first() ||
    $("#login-form").first();
  const action = form.attr("action") || `${BASE}/customer/account/loginPost/`;
  const formKey = form.find('input[name="form_key"]').attr("value")
    || $('input[name="form_key"]').first().attr("value");
  if (!formKey) {
    throw new Error("could not find Magento form_key on login page");
  }

  const body = new URLSearchParams();
  body.set("form_key", formKey);
  body.set("login[username]", username);
  body.set("login[password]", password);
  body.set("send", "");

  log(`portal: POST ${action}`);
  const loginRes = await followRedirects(jar, action, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "accept": "text/html,application/xhtml+xml",
      "origin": BASE,
      "referer": `${BASE}/customer/account/login/`,
    },
    body: body.toString(),
  });

  // Magento redirects authenticated users to /customer/account/ (or the
  // homepage if that's the configured destination). The HTML contains
  // a "logout" link or the customer name when logged in. Failed logins
  // re-render the login page with an error block.
  const finalText = await loginRes.text();
  if (/customer\/account\/logout/i.test(finalText) || /My Account/i.test(finalText)) {
    log("portal: login OK");
    return jar;
  }

  // Surface the Magento error message if we can find it
  const $f = cheerio.load(finalText);
  const err = $f(".message-error, .messages .error, .message.error").first().text().trim();
  throw new Error(`login failed: ${err || `status ${loginRes.status}, no auth markers found`}`);
}

/**
 * Walk a portal listing URL through pagination and return the same
 * shape of entries that walkCategory does for hvacdirect.
 *
 * Reuses the Magento class names .product-item / .product-item-link
 * which are stock Magento defaults — almost all Magento 2 themes
 * inherit them.
 */
export async function walkPortalListing(jar, startUrl, { maxPages = 200, log = () => {} } = {}) {
  const all = [];
  let url = startUrl;
  let page = 1;
  while (url && page <= maxPages) {
    log(`  portal page ${page}: ${url}`);
    const res = await followRedirects(jar, url, { method: "GET" });
    if (!res.ok) {
      log(`  portal page ${page}: HTTP ${res.status}, stopping`);
      break;
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    let countOnPage = 0;
    $("li.product-item, .product-item").each((_, el) => {
      const $el = $(el);

      const infoId = $el.find(".product-item-info").attr("id");
      let sourceId = infoId ? infoId.replace(/^product-item-info_/, "") : null;
      // Some themes don't use product-item-info ids; fall back to data-product-id
      if (!sourceId) sourceId = $el.find("[data-product-id]").attr("data-product-id") ?? null;
      // Final fallback: the URL itself, hashed by trailing slug
      const linkEl = $el.find("a.product-item-link, a.product-item-photo").first();
      const productUrl = linkEl.attr("href") ?? null;
      if (!sourceId && productUrl) {
        sourceId = productUrl.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80);
      }
      if (!sourceId || !productUrl) return;

      const title = $el.find("a.product-item-link").first().text().trim();

      let modelLine = null;
      $el.find("span,div").each((_i, sp) => {
        const txt = $(sp).clone().children().remove().end().text().trim();
        if (txt.startsWith("Model:") && !modelLine) {
          modelLine = txt.replace(/^Model:\s*/, "").trim();
        }
      });

      const oldAmt = $el.find('[data-price-type="oldPrice"]').attr("data-price-amount");
      const saleAmt = $el.find('[data-price-type="finalPrice"], [id^="product-price-"]').attr("data-price-amount");

      const imgSrc = $el.find("img.product-image-photo, img").first().attr("src") ?? null;

      all.push({
        sourceId: `portal_${sourceId}`,   // namespace to avoid clashing with hvacdirect ids
        url: productUrl.startsWith("http") ? productUrl : `${BASE}${productUrl}`,
        title,
        modelLine,
        oldPrice: oldAmt ? Number(oldAmt) : null,
        salePrice: saleAmt ? Number(saleAmt) : null,
        thumbnailUrl: imgSrc,
        from: "aciq-portal",
      });
      countOnPage++;
    });

    log(`  portal page ${page}: ${countOnPage} entries`);
    if (countOnPage === 0) break;

    const nextHref = $('a.action.next, .pages-item-next a').first().attr("href") ?? null;
    if (!nextHref) break;
    url = nextHref.startsWith("http") ? nextHref : new URL(nextHref, url).toString();
    page++;
    await new Promise((r) => setTimeout(r, 100));
  }
  return all;
}

/**
 * Discover category index URLs from the top nav of the authenticated
 * portal homepage. Returns a list of absolute URLs. We don't hardcode
 * them so we pick up whatever the portal exposes to this dealer tier.
 */
export async function discoverPortalCategories(jar, { log = () => {} } = {}) {
  const res = await followRedirects(jar, `${BASE}/`, { method: "GET" });
  if (!res.ok) {
    log(`portal: discover GET / -> ${res.status}`);
    return [];
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const urls = new Set();
  // Top nav: <nav class="navigation"> with a <ul> tree of <a href="…">
  $('nav.navigation a, .nav-sections a, ul.menu a, header a').each((_, el) => {
    let href = $(el).attr("href");
    if (!href) return;
    if (!href.startsWith(BASE) && !href.startsWith("/")) return;
    if (!/.html$/.test(href)) return;
    // Skip account/cart/checkout
    if (/customer|checkout|cart|wishlist|search|contact/i.test(href)) return;
    const abs = href.startsWith("http") ? href : `${BASE}${href}`;
    urls.add(abs);
  });

  return [...urls];
}

/**
 * Top-level convenience: log in, discover categories, walk each, return
 * listing entries (same shape as hvacdirect walker output).
 */
export async function scrapeAciqPortal(username, password, { log = () => {} } = {}) {
  const jar = await loginToAciqPortal(username, password, { log });
  const categories = await discoverPortalCategories(jar, { log });
  log(`portal: discovered ${categories.length} category URLs`);

  // Fall back to common Magento "all products" / "brands" entry points
  // if discovery turns up nothing — better than returning empty.
  if (categories.length === 0) {
    categories.push(`${BASE}/brands/aciq-heating-cooling.html`);
    categories.push(`${BASE}/catalog/category/view/id/1`);
  }

  const seen = new Map();
  for (const url of categories) {
    let entries;
    try {
      entries = await walkPortalListing(jar, url, { log });
    } catch (err) {
      log(`portal: walk ${url} failed: ${err?.message ?? err}`);
      continue;
    }
    for (const e of entries) {
      if (!seen.has(e.sourceId)) seen.set(e.sourceId, e);
    }
  }
  log(`portal: total unique entries ${seen.size}`);
  return [...seen.values()];
}

/**
 * Authenticated detail-page fetch. Magento detail page DOM is
 * vendor-agnostic; reuse the hvacdirect parser, but route the GET
 * through the cookie jar so the portal doesn't bounce us to login.
 */
export async function fetchPortalProductDetail(jar, url) {
  const res = await followRedirects(jar, url, { method: "GET" });
  if (!res.ok) throw new Error(`detail ${res.status} for ${url}`);
  const html = await res.text();
  // Reuse hvacdirect's cheerio extraction by feeding the HTML string in.
  // hvacdirect's fetchProductDetail expects to fetch the URL itself, so
  // we replicate its parsing inline with cheerio here.
  const $ = cheerio.load(html);

  const skuValue = $(".product.attribute.sku .value").first().text().trim() || null;
  const titleH1 = $("h1.page-title, h1.product-title, h1[itemprop='name']").first().text().trim();

  const descHtml = $("[itemprop='description'], .product.attribute.description").first().html() ?? "";
  const noStyle = descHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  const description = cheerio.load(noStyle).text().trim().replace(/\s+/g, " ").slice(0, 5000) || null;

  const specs = {};
  $("table.data.table.additional-attributes tr, .product-info-detailed table tr").each((_, el) => {
    const label = $(el).find("th, .col.label").text().trim();
    const val = $(el).find("td, .col.data").text().trim();
    if (label && val && label.toLowerCase() !== "feature") {
      specs[label] = val;
    }
  });

  const documents = [];
  const seenDocs = new Set();
  $('a[href$=".pdf"], a[href*=".pdf?"]').each((_, el) => {
    let href = $(el).attr("href");
    if (!href) return;
    if (href.startsWith("/")) href = BASE + href;
    if (seenDocs.has(href)) return;
    seenDocs.add(href);
    const name = $(el).text().trim() || "Document";
    documents.push({ url: href, name, type: name });
  });

  const breadcrumbs = [];
  $(".breadcrumbs li, .breadcrumb li").each((_, el) => {
    const t = $(el).text().trim();
    if (t) breadcrumbs.push(t);
  });

  const ogImage = $('meta[property="og:image"]').attr("content") ?? null;

  return {
    titleH1,
    skuValue,
    description,
    specs,
    documents,
    breadcrumbs,
    ogImage,
  };
}
