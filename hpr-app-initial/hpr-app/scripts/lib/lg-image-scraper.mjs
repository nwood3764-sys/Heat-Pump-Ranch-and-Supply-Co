/**
 * LG model-specific image scraper for lghvac.com.
 *
 * Replaces the old type-based image assignment (upload-lg-images.mjs)
 * with actual model-specific product images scraped from LG's public
 * product pages on lghvac.com.
 *
 * Strategy:
 *   1. For each LG product, construct the likely product detail URL on
 *      lghvac.com using the model number.
 *   2. Visit the page with Playwright (it's a JS-rendered site).
 *   3. Extract all product images from the page (hero, gallery, etc.).
 *   4. Return the image URLs for the sync-runner to rehost to Supabase Storage.
 *
 * This runs as part of the public pass in sync-lg.mjs — the image URLs
 * are included in each product's imageUrls array, and the sync-runner
 * handles downloading and rehosting them to Supabase Storage.
 *
 * For products not found on lghvac.com (portal-only SKUs), we fall back
 * to a search-based approach or leave imageUrls empty (the storefront
 * will show a placeholder).
 */

const PUBLIC_BASE = "https://lghvac.com";

/**
 * Scrape model-specific images from lghvac.com for a batch of products.
 * This is called after the public pass to fill in any products that
 * didn't get images from the detail page visit.
 *
 * @param {import('playwright').Browser} browser
 * @param {Array} products - Products array (mutated in place)
 * @param {object} [opts]
 * @param {function} [opts.log]
 * @param {number} [opts.concurrency] - Max parallel pages
 */
export async function scrapeModelImages(browser, products, { log = () => {}, concurrency = 3 } = {}) {
  // Only process products that have no images yet
  const needImages = products.filter(
    (p) => !p.imageUrls || p.imageUrls.length === 0,
  );

  if (needImages.length === 0) {
    log("lg-images: all products already have images");
    return;
  }

  log(`lg-images: ${needImages.length} products need images, scraping from lghvac.com`);

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (HeatPumpRanchBot/1.0; +https://heat-pump-ranch-and-supply-co.netlify.app)",
  });

  // Process in batches for bounded concurrency
  let found = 0;
  let notFound = 0;

  for (let i = 0; i < needImages.length; i += concurrency) {
    const batch = needImages.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((product) => scrapeProductImage(context, product, { log })),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled" && result.value && result.value.length > 0) {
        batch[j].imageUrls = result.value;
        found++;
      } else {
        notFound++;
      }
    }

    if ((i + concurrency) % 15 === 0) {
      log(`lg-images: progress ${Math.min(i + concurrency, needImages.length)}/${needImages.length} (found=${found})`);
    }

    // Small delay between batches to be polite
    await new Promise((r) => setTimeout(r, 500));
  }

  await context.close();
  log(`lg-images: done. Found images for ${found} products, ${notFound} without images.`);
}

/**
 * Scrape images for a single product from lghvac.com.
 * Tries multiple URL patterns to find the product page.
 *
 * @param {import('playwright').BrowserContext} context
 * @param {object} product
 * @param {object} [opts]
 * @returns {Promise<string[]>} Array of image URLs
 */
async function scrapeProductImage(context, product, { log = () => {} } = {}) {
  const page = await context.newPage();
  const model = product.modelNumber || product.sku;

  try {
    // Strategy 1: Try direct product-detail URL with model number
    const searchUrls = [
      `${PUBLIC_BASE}/residential-light-commercial/product-detail?modelId=${model}`,
      `${PUBLIC_BASE}/residential-light-commercial/product-detail?modelId=${model.replace(/\./g, "")}`,
    ];

    for (const url of searchUrls) {
      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        if (response && response.status() === 200) {
          await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

          const images = await extractProductImages(page);
          if (images.length > 0) {
            return images;
          }
        }
      } catch {
        continue;
      }
    }

    // Strategy 2: Use the site search
    try {
      await page.goto(`${PUBLIC_BASE}/search?q=${encodeURIComponent(model)}`, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

      // Find the first product link in search results
      const productLink = await page.evaluate((modelNum) => {
        const links = [...document.querySelectorAll('a[href*="/product-detail"]')];
        // Prefer exact model match
        const exact = links.find((a) =>
          a.textContent.includes(modelNum) || a.href.includes(modelNum),
        );
        return (exact || links[0])?.href ?? null;
      }, model);

      if (productLink) {
        await page.goto(productLink, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

        const images = await extractProductImages(page);
        if (images.length > 0) {
          return images;
        }
      }
    } catch {
      // Search failed, continue
    }

    return [];
  } finally {
    await page.close();
  }
}

/**
 * Extract product images from the current page.
 * Filters out icons, placeholders, and tiny images.
 */
async function extractProductImages(page) {
  return page.evaluate(() => {
    const images = new Set();

    // Priority selectors for product images
    const selectors = [
      ".product-image img",
      ".pdp-image img",
      ".product-gallery img",
      ".gallery img",
      ".slick-slide img",
      "[class*='product-hero'] img",
      "[class*='product-detail'] img",
      "[class*='gallery'] img",
      ".hero-image img",
      "img[class*='product']",
    ];

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((img) => {
        const src = img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy");
        if (src && isValidProductImage(src)) {
          images.add(src);
        }
      });
    }

    // Also check og:image meta tag
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    if (ogImage && isValidProductImage(ogImage)) {
      images.add(ogImage);
    }

    function isValidProductImage(url) {
      if (!url || url.length < 10) return false;
      // Filter out tiny icons, placeholders, logos
      const lower = url.toLowerCase();
      if (lower.includes("placeholder")) return false;
      if (lower.includes("icon")) return false;
      if (lower.includes("logo")) return false;
      if (lower.includes("loading")) return false;
      if (lower.includes("spinner")) return false;
      if (lower.includes("1x1")) return false;
      if (lower.includes("pixel")) return false;
      // Must be an image format
      if (!/\.(jpg|jpeg|png|webp|gif)/i.test(lower) && !lower.includes("image")) return false;
      return true;
    }

    return [...images];
  });
}
