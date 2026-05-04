/**
 * populate-system-pricing.mjs
 *
 * Populates system_packages and system_components from multi-zone combo
 * products (products with "/" in the SKU), then computes system pricing
 * by summing component dealer costs × 1.20 markup.
 *
 * Pricing truth chain:
 *   1. Individual model numbers → dealer cost from ACiQ/LG portal Excel
 *   2. System price = SUM(component dealer costs) × RETAIL_MARKUP
 *   3. System MSRP = SUM(component MSRPs) if available
 *
 * Usage:
 *   node scripts/populate-system-pricing.mjs [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tcnkumgqfezttiqzxsan.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbmt1bWdxZmV6dHRpcXp4c2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM0MDQzMiwiZXhwIjoyMDkyOTE2NDMyfQ.eYbKyg1EKP83afWg0gy3JPKzS4FgL4nhwjSpr_zKm78";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RETAIL_MARKUP = 1.20;
const DRY_RUN = process.argv.includes("--dry-run");

if (DRY_RUN) console.log("=== DRY RUN MODE ===\n");

// ---------------------------------------------------------------
// 1. Load ALL products (active + inactive) for component lookups,
//    and active combos for system creation.
//    Components may be is_active=false as standalone products but
//    still valid parts of active system combos.
//    Supabase default limit is 1000 rows — must paginate.
// ---------------------------------------------------------------
async function fetchAll(table, select, filters = {}) {
  const PAGE = 1000;
  let all = [];
  let offset = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(offset, offset + PAGE - 1);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

const allProducts = await fetchAll("products", "id, sku, brand, title, specs, is_active");
console.log(`Loaded ${allProducts.length} total products`);

const allPricing = await fetchAll("product_pricing", "entity_type, entity_id, cost_equipment, total_price, msrp, tier_id", { tier_id: 1, entity_type: "product" });

const productBySku = new Map(allProducts.map(p => [p.sku, p]));
const pricingByProductId = new Map(allPricing.map(p => [p.entity_id, p]));

// ---------------------------------------------------------------
// 2. Identify ACTIVE combo products (SKU contains " / ")
// ---------------------------------------------------------------
const comboProducts = allProducts.filter(p => p.is_active && p.sku.includes(" / "));
console.log(`Found ${comboProducts.length} combo/system products\n`);

// ---------------------------------------------------------------
// 3. Parse component model numbers from SKU
//    Format: "KUMXB181A / 2-KNUAB091A" → [{model: "KUMXB181A", qty: 1}, {model: "KNUAB091A", qty: 2}]
// ---------------------------------------------------------------
function parseComponents(sku) {
  const parts = sku.split(" / ").map(s => s.trim());
  return parts.map(part => {
    const match = part.match(/^(\d+)-(.+)$/);
    if (match) {
      return { model: match[2], qty: parseInt(match[1], 10) };
    }
    return { model: part, qty: 1 };
  });
}

/**
 * Determine the role of a component based on its equipment_type.
 */
function getRole(product) {
  const eq = product?.specs?.equipment_type;
  if (!eq) return "unknown";
  if (eq === "outdoor-unit") return "condenser";
  if (eq === "indoor-air-handler") return "air_handler";
  if (eq === "indoor-unit") {
    const mt = product?.specs?.mount_type;
    if (mt === "wall-mount") return "wall_mount_head";
    if (mt === "ceiling-cassette") return "cassette_head";
    if (mt === "floor-mount") return "floor_head";
    if (mt === "concealed-duct") return "concealed_duct";
    return "indoor_head";
  }
  if (eq === "indoor-furnace") return "furnace";
  return "unknown";
}

// ---------------------------------------------------------------
// 4. Process each combo product
// ---------------------------------------------------------------
let systemsCreated = 0;
let systemsPriced = 0;
let systemsMissingComponents = 0;
let systemsMissingPricing = 0;
const missingModels = new Set();
const missingPricingModels = new Set();

for (const combo of comboProducts) {
  const components = parseComponents(combo.sku);
  let allComponentsFound = true;
  let allComponentsPriced = true;
  let totalDealerCost = 0;
  let totalMsrp = 0;
  let hasMsrp = false;
  const resolvedComponents = [];

  for (const comp of components) {
    const product = productBySku.get(comp.model);
    if (!product) {
      allComponentsFound = false;
      missingModels.add(comp.model);
      continue;
    }

    const pricing = pricingByProductId.get(product.id);
    if (!pricing || !pricing.cost_equipment || pricing.cost_equipment <= 0) {
      allComponentsPriced = false;
      missingPricingModels.add(comp.model);
    } else {
      totalDealerCost += pricing.cost_equipment * comp.qty;
      if (pricing.msrp && pricing.msrp > 0) {
        totalMsrp += pricing.msrp * comp.qty;
        hasMsrp = true;
      }
    }

    resolvedComponents.push({
      model: comp.model,
      qty: comp.qty,
      productId: product.id,
      role: getRole(product),
      dealerCost: pricing?.cost_equipment ?? null,
      msrp: pricing?.msrp ?? null,
    });
  }

  if (!allComponentsFound) {
    systemsMissingComponents++;
    console.log(`SKIP (missing component): ${combo.sku}`);
    continue;
  }

  if (!allComponentsPriced) {
    systemsMissingPricing++;
    console.log(`SKIP (missing pricing): ${combo.sku}`);
    continue;
  }

  // Compute system price
  const systemRetailPrice = Math.round(totalDealerCost * RETAIL_MARKUP * 100) / 100;
  const systemMsrp = hasMsrp ? Math.round(totalMsrp * 100) / 100 : null;

  console.log(`\nSYSTEM: ${combo.sku}`);
  console.log(`  Title: ${(combo.title || "").substring(0, 70)}`);
  for (const rc of resolvedComponents) {
    console.log(`  ${rc.qty}x ${rc.model} (${rc.role}) dealer=$${rc.dealerCost} msrp=$${rc.msrp}`);
  }
  console.log(`  TOTAL dealer=$${totalDealerCost.toFixed(2)} → retail=$${systemRetailPrice.toFixed(2)} msrp=$${systemMsrp?.toFixed(2) ?? "N/A"}`);

  if (DRY_RUN) {
    systemsPriced++;
    continue;
  }

  // ---------------------------------------------------------------
  // 5. Upsert into system_packages
  // ---------------------------------------------------------------
  const { data: sysRow, error: sysErr } = await supabase
    .from("system_packages")
    .upsert({
      system_sku: combo.sku,
      title: combo.title || combo.sku,
      description: combo.specs?.short_description || null,
      specs: combo.specs || null,
      thumbnail_url: null,
      is_active: true,
    }, { onConflict: "system_sku" })
    .select("id")
    .single();

  if (sysErr) {
    console.error(`  ERROR creating system_package:`, sysErr.message);
    continue;
  }
  const systemId = sysRow.id;
  systemsCreated++;

  // ---------------------------------------------------------------
  // 6. Upsert system_components
  // ---------------------------------------------------------------
  // Delete existing components for this system first (idempotent)
  await supabase.from("system_components").delete().eq("system_id", systemId);

  for (const rc of resolvedComponents) {
    const { error: compErr } = await supabase.from("system_components").insert({
      system_id: systemId,
      product_id: rc.productId,
      quantity: rc.qty,
      role: rc.role,
    });
    if (compErr) {
      console.error(`  ERROR adding component ${rc.model}:`, compErr.message);
    }
  }

  // ---------------------------------------------------------------
  // 7. Upsert system pricing (entity_type = 'system')
  // ---------------------------------------------------------------
  // Check existing price for history tracking
  const { data: existingPrice } = await supabase
    .from("product_pricing")
    .select("total_price")
    .eq("entity_type", "system")
    .eq("entity_id", systemId)
    .eq("tier_id", 1)
    .maybeSingle();

  const oldPrice = existingPrice ? Number(existingPrice.total_price) : null;

  const { error: priceErr } = await supabase
    .from("product_pricing")
    .upsert({
      entity_type: "system",
      entity_id: systemId,
      tier_id: 1,
      cost_equipment: totalDealerCost,
      total_price: systemRetailPrice,
      msrp: systemMsrp,
      updated_at: new Date().toISOString(),
    }, { onConflict: "entity_type,entity_id,tier_id" });

  if (priceErr) {
    console.error(`  ERROR upserting pricing:`, priceErr.message);
    continue;
  }

  // Log price change if different
  if (oldPrice !== null && Math.abs(oldPrice - systemRetailPrice) > 0.005) {
    const deltaPct = ((systemRetailPrice - oldPrice) / oldPrice) * 100;
    await supabase.from("price_history").insert({
      entity_type: "system",
      entity_id: systemId,
      tier_id: 1,
      old_price: oldPrice,
      new_price: systemRetailPrice,
      delta_pct: Number(deltaPct.toFixed(2)),
      source: "computed",
    });
    console.log(`  PRICE CHANGE: $${oldPrice} → $${systemRetailPrice} (${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`);
  }

  // ---------------------------------------------------------------
  // 8. Also upsert into product_pricing for the combo PRODUCT row
  //    (so the storefront can read pricing via product.id)
  // ---------------------------------------------------------------
  const { data: existingProductPrice } = await supabase
    .from("product_pricing")
    .select("total_price")
    .eq("entity_type", "product")
    .eq("entity_id", combo.id)
    .eq("tier_id", 1)
    .maybeSingle();

  const oldProductPrice = existingProductPrice ? Number(existingProductPrice.total_price) : null;

  await supabase
    .from("product_pricing")
    .upsert({
      entity_type: "product",
      entity_id: combo.id,
      tier_id: 1,
      cost_equipment: totalDealerCost,
      total_price: systemRetailPrice,
      msrp: systemMsrp,
      updated_at: new Date().toISOString(),
    }, { onConflict: "entity_type,entity_id,tier_id" });

  if (oldProductPrice !== null && Math.abs(oldProductPrice - systemRetailPrice) > 0.005) {
    const deltaPct = ((systemRetailPrice - oldProductPrice) / oldProductPrice) * 100;
    await supabase.from("price_history").insert({
      entity_type: "product",
      entity_id: combo.id,
      tier_id: 1,
      old_price: oldProductPrice,
      new_price: systemRetailPrice,
      delta_pct: Number(deltaPct.toFixed(2)),
      source: "computed",
    });
  }

  systemsPriced++;
}

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------
console.log("\n=== SUMMARY ===");
console.log(`Total combo products: ${comboProducts.length}`);
console.log(`Systems created/updated: ${systemsCreated}`);
console.log(`Systems priced: ${systemsPriced}`);
console.log(`Skipped (missing component in DB): ${systemsMissingComponents}`);
console.log(`Skipped (missing component pricing): ${systemsMissingPricing}`);

if (missingModels.size > 0) {
  console.log(`\nMissing component models (not in products table):`);
  for (const m of missingModels) console.log(`  ${m}`);
}
if (missingPricingModels.size > 0) {
  console.log(`\nComponent models missing pricing:`);
  for (const m of missingPricingModels) console.log(`  ${m}`);
}
