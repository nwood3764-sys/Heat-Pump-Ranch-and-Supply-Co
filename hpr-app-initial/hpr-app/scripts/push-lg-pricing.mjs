/**
 * push-lg-pricing.mjs
 *
 * One-shot script to push LG pricing from the downloaded Excel file
 * directly into Supabase. This updates existing LG products with
 * dealer cost and calculates retail pricing.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node push-lg-pricing.mjs <excel-path> [--dry-run]
 *
 * This script:
 *   1. Parses the Excel file (756 products with dealer cost + list price)
 *   2. Matches each model to existing products in Supabase by SKU/model_number
 *   3. Upserts pricing: cost_equipment = dealer cost, total_price = dealer × 1.30, msrp = list price
 *   4. Creates new products for models not yet in the DB
 */

import { createClient } from "@supabase/supabase-js";
import { parseLgExcel, mapCategory, getProductType, parseSpecs } from "./lib/lg-excel-parser.mjs";

const RETAIL_MARKUP = 1.30;

function log(msg) {
  console.log(`[push-lg-pricing] ${msg}`);
}

async function main() {
  const excelPath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");

  if (!excelPath) {
    console.error("Usage: node push-lg-pricing.mjs <path-to-excel> [--dry-run]");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  const supabase = createClient(url, key);

  // Parse Excel
  log(`Parsing Excel: ${excelPath}`);
  const products = await parseLgExcel(excelPath, { log });
  log(`Parsed ${products.length} products from Excel`);

  if (dryRun) {
    log("DRY RUN — showing first 10 products:");
    for (const p of products.slice(0, 10)) {
      const ourPrice = Math.round(p.dealer_cost * RETAIL_MARKUP * 100) / 100;
      log(`  ${p.model}: dealer=$${p.dealer_cost} → retail=$${ourPrice}, list=$${p.list_price}`);
    }
    log(`Would process ${products.length} products. Exiting.`);
    return;
  }

  // Get or create Retail pricing tier
  const { data: tiers } = await supabase.from("pricing_tiers").select("id, name");
  let retailTierId;
  if (tiers && tiers.length > 0) {
    const retail = tiers.find((t) => t.name.toLowerCase() === "retail");
    retailTierId = retail?.id;
  }
  if (!retailTierId) {
    const { data: newTier, error: tierErr } = await supabase
      .from("pricing_tiers")
      .insert({ name: "Retail", description: "Standard retail pricing" })
      .select("id")
      .single();
    if (tierErr) throw tierErr;
    retailTierId = newTier.id;
  }
  log(`Retail tier ID: ${retailTierId}`);

  // Get existing LG products
  const { data: existingProducts } = await supabase
    .from("products")
    .select("id, sku, model_number, brand")
    .or("brand.eq.LG,source_portal.eq.lg");

  const skuMap = new Map();
  for (const p of existingProducts ?? []) {
    if (p.sku) skuMap.set(p.sku.toUpperCase(), p);
    if (p.model_number) skuMap.set(p.model_number.toUpperCase(), p);
  }
  log(`Found ${existingProducts?.length ?? 0} existing LG products in DB`);

  // Get existing categories
  const { data: categories } = await supabase.from("categories").select("id, slug");
  const catMap = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  // Ensure needed categories exist
  const neededCats = new Set(products.map((p) => mapCategory(p.model, p.description)));
  for (const slug of neededCats) {
    if (!catMap.has(slug)) {
      const name = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const { data: newCat } = await supabase
        .from("categories")
        .insert({ slug, name, description: `${name} products` })
        .select("id")
        .single();
      if (newCat) catMap.set(slug, newCat.id);
    }
  }

  let priced = 0;
  let created = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const dealerCost = product.dealer_cost;
      const listPrice = product.list_price;
      const ourPrice = Math.round(dealerCost * RETAIL_MARKUP * 100) / 100;

      let existing = skuMap.get(product.model.toUpperCase());
      let productId;

      if (existing) {
        productId = existing.id;
      } else {
        // Create new product
        const categorySlug = mapCategory(product.model, product.description);
        const categoryId = catMap.get(categorySlug) ?? null;
        const specs = parseSpecs(product.description);
        const productType = getProductType(product.description);

        const productData = {
          sku: product.model,
          brand: "LG",
          title: product.description || product.model,
          model_number: product.model,
          category_id: categoryId,
          product_type: productType,
          specs,
          source_portal: "lg",
          source_id: `lg-portal-${product.model}`,
          last_synced_at: new Date().toISOString(),
          is_active: true,
          discontinued_at: null,
        };

        const { data: upserted, error: upsertErr } = await supabase
          .from("products")
          .upsert(productData, { onConflict: "sku" })
          .select("id")
          .single();

        if (upsertErr) {
          log(`  FAIL create ${product.model}: ${upsertErr.message}`);
          failed++;
          continue;
        }
        productId = upserted.id;
        created++;
      }

      // Upsert pricing
      const { error: priceErr } = await supabase.from("product_pricing").upsert(
        {
          entity_type: "product",
          entity_id: productId,
          tier_id: retailTierId,
          cost_equipment: dealerCost,
          total_price: ourPrice,
          msrp: listPrice,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,entity_id,tier_id" },
      );

      if (priceErr) {
        log(`  PRICE FAIL ${product.model}: ${priceErr.message}`);
        failed++;
        continue;
      }

      priced++;
      if (priced % 100 === 0) {
        log(`  progress: ${priced}/${products.length}`);
      }
    } catch (err) {
      log(`  ERROR ${product.model}: ${err.message}`);
      failed++;
    }
  }

  log(`\n===== PUSH COMPLETE =====`);
  log(`Products priced: ${priced}`);
  log(`New products created: ${created}`);
  log(`Failed: ${failed}`);
  log(`Total in Excel: ${products.length}`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
