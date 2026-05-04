/**
 * Backfill products.thumbnail_url from product_images.
 *
 * Many products were uploaded via upload-portal-products.mjs which
 * inserts rows into product_images but does NOT set products.thumbnail_url.
 * The catalog listing page reads thumbnail_url to display product images,
 * so products without it show a placeholder icon.
 *
 * This script finds all products where thumbnail_url IS NULL but a
 * primary image exists in product_images, and sets thumbnail_url to
 * that image's URL.
 *
 * Usage:
 *   node backfill-thumbnails.mjs              — run the backfill
 *   node backfill-thumbnails.mjs --dry-run    — preview without writing
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const log = (...m) => console.error("[backfill-thumbnails]", ...m);

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Find all products with NULL thumbnail_url
  log("Fetching products with NULL thumbnail_url...");
  const PAGE = 1000;
  let allProducts = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, thumbnail_url")
      .is("thumbnail_url", null)
      .eq("is_active", true)
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    allProducts = allProducts.concat(data || []);
    if (!data || data.length < PAGE) break;
    offset += PAGE;
  }
  log(`Found ${allProducts.length} products with NULL thumbnail_url`);

  if (allProducts.length === 0) {
    log("Nothing to backfill — all products have thumbnail_url set.");
    return;
  }

  // For each product, find the primary image (is_primary=true, or lowest sort_order)
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches to avoid overwhelming the DB
  const BATCH = 100;
  for (let i = 0; i < allProducts.length; i += BATCH) {
    const batch = allProducts.slice(i, i + BATCH);
    const ids = batch.map((p) => p.id);

    // Fetch all images for this batch of products
    const { data: images, error: imgErr } = await supabase
      .from("product_images")
      .select("product_id, url, is_primary, sort_order")
      .in("product_id", ids)
      .order("sort_order", { ascending: true });

    if (imgErr) {
      log(`Error fetching images for batch ${i}: ${imgErr.message}`);
      failed += batch.length;
      continue;
    }

    // Group images by product_id
    const imagesByProduct = new Map();
    for (const img of images || []) {
      if (!imagesByProduct.has(img.product_id)) {
        imagesByProduct.set(img.product_id, []);
      }
      imagesByProduct.get(img.product_id).push(img);
    }

    // Update each product
    for (const product of batch) {
      const productImages = imagesByProduct.get(product.id);
      if (!productImages || productImages.length === 0) {
        skipped++;
        continue;
      }

      // Pick the primary image, or the first by sort_order
      const primary = productImages.find((img) => img.is_primary) || productImages[0];
      if (!primary || !primary.url) {
        skipped++;
        continue;
      }

      if (dryRun) {
        log(`  [DRY RUN] ${product.sku}: would set thumbnail_url = ${primary.url.substring(0, 80)}...`);
        updated++;
        continue;
      }

      const { error: updateErr } = await supabase
        .from("products")
        .update({ thumbnail_url: primary.url })
        .eq("id", product.id);

      if (updateErr) {
        log(`  FAIL ${product.sku}: ${updateErr.message}`);
        failed++;
      } else {
        updated++;
      }
    }

    if ((i + BATCH) % 500 === 0 || i + BATCH >= allProducts.length) {
      log(`  Progress: ${Math.min(i + BATCH, allProducts.length)}/${allProducts.length} (updated: ${updated}, skipped: ${skipped}, failed: ${failed})`);
    }
  }

  log(`\n===== BACKFILL COMPLETE =====`);
  log(`Total products with NULL thumbnail: ${allProducts.length}`);
  log(`Updated: ${updated}`);
  log(`Skipped (no images in product_images): ${skipped}`);
  log(`Failed: ${failed}`);
  if (dryRun) log(`(DRY RUN — no changes written)`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
