/**
 * Direct upload of portal-scraped products to Supabase.
 *
 * Uses the pre-scraped portal JSON (with full product details) and pushes
 * directly to the database with the dealer cost × 1.30 pricing model.
 *
 * Usage:
 *   node upload-portal-products.mjs --file=/path/to/aciq-full-products.json
 *   node upload-portal-products.mjs --file=/path/to/products.json --dry-run
 *   node upload-portal-products.mjs --file=/path/to/products.json --limit=10
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const RETAIL_MARKUP = 1.3;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
const fileArg = args.find((a) => a.startsWith("--file="));
const filePath = fileArg
  ? fileArg.split("=")[1]
  : "/home/ubuntu/Downloads/aciq-full-products.json";

const log = (...m) => console.error("[upload]", ...m);

// Load products
log(`Loading products from: ${filePath}`);
const products = JSON.parse(readFileSync(filePath, "utf-8"));
log(`Loaded ${products.length} products`);

// Map portal category paths to our category slugs
function mapCategory(portalCategory) {
  if (!portalCategory) return "mini-split";
  if (portalCategory.includes("heat-pump-systems")) return "heat-pump-system";
  if (portalCategory.includes("air-conditioners")) return "air-conditioner";
  if (portalCategory.includes("heat-pumps")) return "heat-pump";
  if (portalCategory.includes("coils")) return "coil";
  if (portalCategory.includes("ducted-air-handlers")) return "air-handler";
  if (portalCategory.includes("mobile-home")) return "mobile-home";
  return "mini-split";
}

// Determine product type from name and category
function getProductType(product) {
  const name = product.name.toLowerCase();
  if (name.includes("grille") || name.includes("accessory") || name.includes("kit")) return "accessory";
  if (name.includes("line set") || name.includes("thermostat")) return "accessory";
  return "equipment";
}

// Detect refrigerant from product name
function detectRefrigerant(name) {
  if (/R-?454B/i.test(name)) return "R-454B";
  if (/R-?32\b/i.test(name)) return "R-32";
  if (/R-?410A/i.test(name)) return "R-410A";
  return null;
}

// Filter out R-410A products
function shouldExclude(product) {
  const refrigerant = detectRefrigerant(product.name);
  if (refrigerant === "R-410A") return true;
  // Also exclude discontinued markers
  if (/discontinued|obsolete|clearance/i.test(product.name)) return true;
  return false;
}

// Parse specs from product name
function parseSpecs(product) {
  const name = product.name;
  const specs = {};

  // BTU
  const btuMatch = name.match(/([\d,]+)\s*BTU/i);
  if (btuMatch) specs.btu = parseInt(btuMatch[1].replace(/,/g, ""));

  // Tonnage
  const tonMatch = name.match(/([\d.]+)\s*Ton/i);
  if (tonMatch) specs.tonnage = parseFloat(tonMatch[1]);

  // SEER
  const seerMatch = name.match(/([\d.]+)\s*SEER2?/i);
  if (seerMatch) specs.seer2 = parseFloat(seerMatch[1]);

  // Voltage
  const voltMatch = name.match(/(\d+)\s*V\b/i);
  if (voltMatch) specs.voltage = `${voltMatch[1]}V`;

  // Refrigerant
  const refrigerant = detectRefrigerant(name);
  if (refrigerant) specs.refrigerant = refrigerant;

  // Zone type
  if (/single\s*zone/i.test(name)) specs.zone_type = "single";
  else if (/multi[\s-]*zone/i.test(name)) specs.zone_type = "multi";

  // Mount type
  if (/wall\s*mount/i.test(name)) specs.mount_type = "wall";
  else if (/floor\s*mount/i.test(name)) specs.mount_type = "floor";
  else if (/ceiling\s*cassette/i.test(name)) specs.mount_type = "ceiling-cassette";
  else if (/ducted/i.test(name)) specs.mount_type = "ducted";

  return specs;
}

function computeRetailPrice(dealerCost) {
  return Math.round(dealerCost * RETAIL_MARKUP * 100) / 100;
}

async function main() {
  // Filter products
  let filtered = products.filter((p) => !shouldExclude(p));
  log(`After filtering: ${filtered.length} products (excluded ${products.length - filtered.length} R-410A/discontinued)`);

  if (limit) {
    filtered = filtered.slice(0, limit);
    log(`--limit=${limit}: processing ${filtered.length} products`);
  }

  if (dryRun) {
    log("DRY RUN — showing pricing summary");
    log(`\n${"SKU".padEnd(30)} ${"Dealer".padStart(10)} ${"Our Price".padStart(10)} ${"Category".padStart(20)}`);
    log("-".repeat(75));
    for (const p of filtered.slice(0, 30)) {
      const ourPrice = computeRetailPrice(p.price);
      const cat = mapCategory(p.category);
      log(`${p.model.padEnd(30)} ${("$" + p.price.toFixed(2)).padStart(10)} ${("$" + ourPrice.toFixed(2)).padStart(10)} ${cat.padStart(20)}`);
    }
    log(`\nTotal: ${filtered.length} products`);
    log(`Average dealer cost: $${(filtered.reduce((s, p) => s + p.price, 0) / filtered.length).toFixed(2)}`);
    log(`Average our price: $${(filtered.reduce((s, p) => s + computeRetailPrice(p.price), 0) / filtered.length).toFixed(2)}`);
    process.exit(0);
  }

  // Connect to Supabase
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Create sync_runs entry
  const { data: runRow, error: runErr } = await supabase
    .from("sync_runs")
    .insert({ portal: "aciq", status: "running", triggered_by: "manual" })
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
  const neededCats = new Set(filtered.map((p) => mapCategory(p.category)));
  for (const slug of neededCats) {
    if (!catMap.has(slug)) {
      const name = slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
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
  let updated = 0;
  let failed = 0;

  for (const product of filtered) {
    try {
      const categorySlug = mapCategory(product.category);
      const categoryId = catMap.get(categorySlug) ?? null;
      const specs = parseSpecs(product);
      const ourPrice = computeRetailPrice(product.price);

      // Upsert product
      const productData = {
        sku: product.model,
        brand: "ACiQ",
        title: product.name,
        model_number: product.model,
        category_id: categoryId,
        product_type: getProductType(product),
        specs,
        source_portal: "aciq",
        source_id: `portal-${product.model}`,
        source_url: product.link || null,
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
        log(`  FAIL ${product.model}: ${upsertErr.message}`);
        failed++;
        continue;
      }
      const productId = upserted.id;

      // Upsert pricing
      const { error: priceErr } = await supabase.from("product_pricing").upsert(
        {
          entity_type: "product",
          entity_id: productId,
          tier_id: retailTierId,
          cost_equipment: product.price,
          total_price: ourPrice,
          msrp: null, // Will be filled by nightly HVAC Direct scrape
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,entity_id,tier_id" },
      );
      if (priceErr) {
        log(`  PRICE FAIL ${product.model}: ${priceErr.message}`);
      }

      // Upsert primary image
      if (product.image) {
        const { error: imgErr } = await supabase.from("product_images").upsert(
          {
            product_id: productId,
            url: product.image,
            source_url: product.image,
            sort_order: 0,
            is_primary: true,
          },
          { onConflict: "product_id,sort_order" },
        );
        if (imgErr && !imgErr.message.includes("duplicate")) {
          // Try insert instead
          await supabase.from("product_images").insert({
            product_id: productId,
            url: product.image,
            source_url: product.image,
            sort_order: 0,
            is_primary: true,
          });
        }
      }

      // Track sync run item
      await supabase.from("sync_run_items").insert({
        sync_run_id: runId,
        source_id: `portal-${product.model}`,
        product_id: productId,
        sku: product.model,
        action: "created",
      });

      added++;
      if (added % 50 === 0) {
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
      products_updated: updated,
      products_failed: failed,
    })
    .eq("id", runId);

  log(`\n===== UPLOAD COMPLETE =====`);
  log(`Products uploaded: ${added}`);
  log(`Failed: ${failed}`);
  log(`Sync run ID: ${runId}`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
