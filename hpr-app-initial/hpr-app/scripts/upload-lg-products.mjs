#!/usr/bin/env node
/**
 * Upload LG products from portal price list Excel export to Supabase.
 * 
 * Pricing model:
 *   - List Price from LG portal = MSRP (used for strikethrough display)
 *   - Dealer Cost = List Price × (1 - discount%) = "Sales Price" from portal
 *   - Our Price = Dealer Cost × 1.30
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node upload-lg-products.mjs [--dry-run] [--limit=N]
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const RETAIL_MARKUP = 1.30;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

const log = (...m) => console.error("[lg-upload]", ...m);

// Load the LG portal products JSON (pre-extracted from Excel)
const allProducts = JSON.parse(readFileSync("/home/ubuntu/lg-portal-products.json", "utf-8"));

// Filter to residential heat pump products relevant for HPR
const RESIDENTIAL_PREFIXES = ["KUSA", "KUSX", "KNSA", "KNSL", "KUMX", "KNUA", "LKMM"];
const SPECIAL_PREFIXES = ["ㄴ LS", "ㄴ LU", "ㄴ LA", "ㄴ LC", "ㄴ LH", "ㄴ LV", "ㄴ LQ", "ㄴ KN", "ㄴ KU"];

function isRelevant(model) {
  if (RESIDENTIAL_PREFIXES.some(px => model.startsWith(px))) return true;
  if (SPECIAL_PREFIXES.some(px => model.startsWith(px))) return true;
  return false;
}

// Clean up model names that have the Korean character prefix
function cleanModel(model) {
  if (model.startsWith("ㄴ ")) return model.substring(2);
  return model;
}

// Determine category slug based on model/description
function mapCategory(model, description) {
  const desc = description.toLowerCase();
  const m = cleanModel(model).toUpperCase();
  
  if (m.startsWith("KUS") || m.startsWith("KUM") || m.startsWith("LU") || m.startsWith("LS")) {
    return "heat-pump"; // Outdoor units
  }
  if (desc.includes("air handler") || desc.includes("ahu") || desc.includes("a-coil") || desc.includes("vahu")) {
    return "air-handler";
  }
  if (desc.includes("wall mount") || desc.includes("art cool")) {
    return "mini-split";
  }
  if (desc.includes("cassette") || desc.includes("ducted") || desc.includes("floor standing") || desc.includes("console")) {
    return "mini-split";
  }
  return "mini-split";
}

// Determine product type from description
function getProductType(description) {
  const desc = description.toLowerCase();
  if (desc.includes("kit") || desc.includes("grille") || desc.includes("controller") || desc.includes("thermostat")) return "accessory";
  return "equipment";
}

// Parse specs from description
function parseSpecs(description) {
  const specs = {};
  
  // BTU
  const btuMatch = description.match(/(\d+)\s*k?\s*(?:btu|mbh)/i);
  if (btuMatch) {
    const val = parseInt(btuMatch[1]);
    specs.btu = val > 1000 ? val : val * 1000;
  }
  
  // Tonnage from BTU
  if (specs.btu) specs.tonnage = Math.round((specs.btu / 12000) * 10) / 10;
  
  // Refrigerant
  if (/r-?32\b/i.test(description)) specs.refrigerant = "R-32";
  else if (/r-?454b/i.test(description)) specs.refrigerant = "R-454B";
  else if (/r-?410a/i.test(description)) specs.refrigerant = "R-410A";
  
  // Zone type
  if (/single\s*zone/i.test(description)) specs.zone_type = "single";
  else if (/multi[\s-]*zone/i.test(description)) specs.zone_type = "multi";
  
  // Voltage
  const voltMatch = description.match(/(\d+)\s*[/-]?\s*(\d+)?\s*V\b/i);
  if (voltMatch) specs.voltage = voltMatch[0];
  
  // LGRED
  if (/lgred/i.test(description)) specs.lgred = true;
  
  return specs;
}

function computeRetailPrice(dealerCost) {
  return Math.round(dealerCost * RETAIL_MARKUP * 100) / 100;
}

async function main() {
  // Filter products
  let filtered = allProducts.filter(p => isRelevant(p.model));
  log(`Total LG products: ${allProducts.length}`);
  log(`Relevant residential: ${filtered.length}`);

  if (limit) {
    filtered = filtered.slice(0, limit);
    log(`--limit=${limit}: processing ${filtered.length} products`);
  }

  if (dryRun) {
    log("DRY RUN — showing pricing summary");
    log(`\n${"SKU".padEnd(20)} ${"Dealer".padStart(10)} ${"Our Price".padStart(10)} ${"List/MSRP".padStart(10)} ${"Savings".padStart(8)}`);
    log("-".repeat(65));
    for (const p of filtered.slice(0, 30)) {
      const sku = cleanModel(p.model);
      const ourPrice = computeRetailPrice(p.dealer_cost);
      const savings = Math.round((1 - ourPrice / p.list_price) * 100);
      log(`${sku.padEnd(20)} ${("$" + p.dealer_cost.toFixed(2)).padStart(10)} ${("$" + ourPrice.toFixed(2)).padStart(10)} ${("$" + p.list_price.toFixed(2)).padStart(10)} ${(savings + "%").padStart(8)}`);
    }
    log(`\nTotal: ${filtered.length} products`);
    process.exit(0);
  }

  // Connect to Supabase
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Create sync_runs entry
  const { data: runRow, error: runErr } = await supabase
    .from("sync_runs")
    .insert({ portal: "lg", status: "running", triggered_by: "manual" })
    .select("id")
    .single();
  if (runErr) throw runErr;
  const runId = runRow.id;
  log(`Created sync run: ${runId}`);

  // Get or create pricing tier
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

  // Get existing categories
  const { data: categories } = await supabase.from("categories").select("id, slug");
  const catMap = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  // Ensure our categories exist
  const neededCats = new Set(filtered.map((p) => mapCategory(p.model, p.description)));
  for (const slug of neededCats) {
    if (!catMap.has(slug)) {
      const name = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const { data: newCat, error: catErr } = await supabase
        .from("categories")
        .insert({ slug, name, description: `${name} products` })
        .select("id")
        .single();
      if (catErr) {
        log(`Category ${slug} insert error: ${catErr.message}`);
      } else {
        catMap.set(slug, newCat.id);
      }
    }
  }

  let added = 0;
  let failed = 0;

  for (const product of filtered) {
    try {
      const sku = cleanModel(product.model);
      const categorySlug = mapCategory(product.model, product.description);
      const categoryId = catMap.get(categorySlug) ?? null;
      const specs = parseSpecs(product.description);
      const ourPrice = computeRetailPrice(product.dealer_cost);

      // Upsert product
      const productData = {
        sku: sku,
        brand: "LG",
        title: `LG ${product.description}`,
        model_number: sku,
        category_id: categoryId,
        product_type: getProductType(product.description),
        specs,
        source_portal: "lg",
        source_id: `lg-portal-${sku}`,
        source_url: `https://www.lghvacpro.com/professional/s/price-list`,
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
        log(`  FAIL ${sku}: ${upsertErr.message}`);
        failed++;
        continue;
      }
      const productId = upserted.id;

      // Upsert pricing (with MSRP = LG list price for strikethrough)
      const { error: priceErr } = await supabase.from("product_pricing").upsert(
        {
          entity_type: "product",
          entity_id: productId,
          tier_id: retailTierId,
          cost_equipment: product.dealer_cost,
          total_price: ourPrice,
          msrp: product.list_price, // LG list price used for strikethrough
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,entity_id,tier_id" },
      );
      if (priceErr) {
        log(`  PRICE FAIL ${sku}: ${priceErr.message}`);
      }

      // Track sync run item
      await supabase.from("sync_run_items").insert({
        sync_run_id: runId,
        source_id: `lg-portal-${sku}`,
        product_id: productId,
        sku: sku,
        action: "created",
      });

      added++;
      if (added % 25 === 0) {
        log(`  progress: ${added}/${filtered.length}`);
      }
    } catch (err) {
      log(`  ERROR ${product.model}: ${err.message}`);
      failed++;
    }
  }

  // Finalize sync run
  await supabase
    .from("sync_runs")
    .update({
      status: failed > 0 ? "partial" : "completed",
      completed_at: new Date().toISOString(),
      products_seen: filtered.length,
      products_added: added,
      products_updated: 0,
      products_failed: failed,
    })
    .eq("id", runId);

  log(`\n===== LG UPLOAD COMPLETE =====`);
  log(`Products uploaded: ${added}`);
  log(`Failed: ${failed}`);
  log(`Sync run ID: ${runId}`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
