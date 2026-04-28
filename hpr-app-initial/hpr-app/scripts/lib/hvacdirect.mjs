/**
 * HVACDirect.com scraper utilities.
 *
 * HVACDirect is a server-rendered Magento 2 storefront â no JS execution
 * needed. Plain fetch + cheerio gets us full product data including the
 * spec table, description, PDF documents, and pricing.
 *
 * Used by sync-aciq.mjs as the primary public-data source for the ACiQ
 * product line.
 */

import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (HeatPumpRanchBot/1.0; +https://heat-pump-ranch-and-supply-co.netlify.app)";
const BASE = "https://hvacdirect.com";

export const HVACDIRECT_BASE = BASE;

async function fetchHtml(url, { retries = 3, delayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * Parse a Magento listing page (a brand or subcategory page) and return
 * the products on this page plus the URL of the next page if pagination
 * continues.
 */
export async function fetchListingPage(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const items = [];
  $("li.product-item").each((_, el) => {
    const $el = $(el);

    const infoId = $el.find(".product-item-info").attr("id"); // product-item-info_216152
    const sourceId = infoId ? infoId.replace(/^product-item-info_/, "") : null;
    if (!sourceId) return;

    const linkEl = $el.find("a.product-item-link").first();
    const productUrl = linkEl.attr("href") ?? null;
    const title = linkEl.text().trim();

    let modelLine = null;
    $el.find("span").each((_i, sp) => {
      const txt = $(sp).clone().children().remove().end().text().trim();
      if (txt.startsWith("Model:") && !modelLine) {
        modelLine = txt.replace(/^Model:\s*/, "").trim();
      }
    });

    const oldAmt = $el.find('[data-price-type="oldPrice"]').attr("data-price-amount");
    const saleAmt = $el.find('[id^="product-price-"]').attr("data-price-amount");

    const imgSrc = $el.find("img.product-image-photo").attr("src") ?? null;

    items.push({
      sourceId,
      url: productUrl,
      title,
      modelLine,
      oldPrice: oldAmt ? Number(oldAmt) : null,
      salePrice: saleAmt ? Number(saleAmt) : null,
      thumbnailUrl: imgSrc,
    });
  });

  // Find next page link (Magento toolbar). The current page link is
  // "current" and the next one is the next sibling <a>.
  const nextHref = $("a.action.next, .pages-item-next a").first().attr("href") ?? null;

  return { items, nextUrl: nextHref };
}

/**
 * Walk a category URL through every page of pagination, returning all
 * listing-level product entries. Caps at maxPages defensively.
 */
export async function walkCategory(startUrl, { maxPages = 100, log = () => {} } = {}) {
  const all = [];
  let url = startUrl;
  let page = 1;
  while (url && page <= maxPages) {
    log(`  page ${page}: ${url}`);
    const { items, nextUrl } = await fetchListingPage(url);
    if (items.length === 0) break;
    all.push(...items);
    url = nextUrl;
    page++;
    // Polite throttle between pages
    await new Promise((r) => setTimeout(r, 250));
  }
  return all;
}

/**
 * Fetch a product detail page and return enriched fields:
 *   - description (clean text)
 *   - specs object (key/value from spec table)
 *   - documents array (PDFs)
 *   - breadcrumbs array (for category mapping)
 *   - skuValue (from .product.attribute.sku â most reliable model identifier)
 */
export async function fetchProductDetail(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const skuValue = $(".product.attribute.sku .value").first().text().trim() || null;
  const titleH1 = $("h1.page-title, h1.product-title, h1[itemprop='name']").first().text().trim();

  // Description: strip the <style> blocks Magento PageBuilder injects
  const descHtml = $("[itemprop='description'], .product.attribute.description").first().html() ?? "";
  const noStyle = descHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  const description = cheerio.load(noStyle).text().trim().replace(/\s+/g, " ").slice(0, 5000) || null;

  // Spec table: row of label | value
  const specs = {};
  $("table.data.table.additional-attributes tr, .product-info-detailed table tr").each((_, el) => {
    const label = $(el).find("th, .col.label").text().trim();
    const val = $(el).find("td, .col.data").text().trim();
    if (label && val && label.toLowerCase() !== "feature") {
      specs[label] = val;
    }
  });

  // PDF documents
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

  // Breadcrumbs â give us the public taxonomy
  const breadcrumbs = [];
  $(".breadcrumbs li, .breadcrumb li").each((_, el) => {
    const t = $(el).text().trim();
    if (t) breadcrumbs.push(t);
  });

  // Gallery images: collect from media-gallery metadata if present, else
  // fallback to the listing thumbnail. The reliable JSON-embedded path is
  // mage-init's "mediaGallery" â but the simpler/safer source is the
  // <img> tags inside the gallery placeholder once present, OR the og:image.
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

/**
 * Map an HVACDirect breadcrumb chain to one of our seeded category slugs.
 * Returns null if no match â the runner will leave category_id null and
 * we can fix mappings as edge cases emerge.
 */
export function mapBreadcrumbsToCategory(breadcrumbs) {
  const path = breadcrumbs.map((b) => b.toLowerCase()).join(" / ");

  // Order matters â most specific first
  if (path.includes("mini split") || path.includes("ductless")) return "mini-splits";
  if (path.includes("heat pump") && path.includes("coil")) return "heat-pump-coil";
  if (path.includes("heat pump") && path.includes("system")) return "heat-pump-systems";
  if (path.includes("heat pump") && path.includes("condenser")) return "heat-pump-condensers";
  if (path.includes("heat pump")) return "heat-pumps";
  if (path.includes("ac & furnace") || path.includes("furnace & air conditioner") || path.includes("furnace and air conditioner"))
    return "ac-furnace-systems";
  if (path.includes("furnace")) return "furnaces";
  if (path.includes("air handler")) return "air-handlers";
  if (path.includes("ac condenser") || (path.includes("air conditioner") && path.includes("condenser")))
    return "ac-condensers";
  if (path.includes("air conditioner")) return "air-conditioners";
  return null;
}

/**
 * Parse a model-line string from HVACDirect like
 *   "ACIQ-09Z-HP115C / ACIQ-09W-HP115C"
 * into a primary SKU and a list of all SKUs. The primary is the one
 * we'll use for products.sku â usually the first.
 */
export function parseModelLine(modelLine) {
  if (!modelLine) return { primarySku: null, allSkus: [] };
  const all = modelLine
    .split(/\s*\/\s*|\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { primarySku: all[0] ?? null, allSkus: all };
}
