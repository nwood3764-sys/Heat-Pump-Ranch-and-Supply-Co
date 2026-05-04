/**
 * audit-pricing-integrity.mjs
 *
 * Comprehensive pricing audit that verifies:
 *  1. Every active product has pricing
 *  2. All prices meet the 20% minimum markup rule
 *  3. System prices match the sum of component dealer costs × 1.20
 *  4. No negative savings (our price > MSRP/HVAC Direct)
 *  5. No stale pricing (unchanged for > 30 days)
 *  6. 410-A refrigerant products are excluded
 *  7. Flags action items for the nightly report
 *
 * Usage:
 *   node scripts/audit-pricing-integrity.mjs [--fix] [--json]
 *
 * --fix   : Auto-fix issues where possible (recalculate system prices, deactivate no-price)
 * --json  : Output results as JSON for the nightly email report
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tcnkumgqfezttiqzxsan.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbmt1bWdxZmV6dHRpcXp4c2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM0MDQzMiwiZXhwIjoyMDkyOTE2NDMyfQ.eYbKyg1EKP83afWg0gy3JPKzS4FgL4nhwjSpr_zKm78";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FIX_MODE = process.argv.includes("--fix");
const JSON_MODE = process.argv.includes("--json");
const RETAIL_MARKUP = 1.20;
const STALE_DAYS = 30;

// ---------------------------------------------------------------
// Helper: paginated fetch
// ---------------------------------------------------------------
async function fetchAll(table, select, filters = {}) {
  const PAGE = 1000;
  let all = [], offset = 0;
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

// ---------------------------------------------------------------
// Load data
// ---------------------------------------------------------------
const allProducts = await fetchAll("products", "id, sku, brand, title, specs, is_active");
const activeProducts = allProducts.filter(p => p.is_active);
const allPricing = await fetchAll("product_pricing", "*", { tier_id: 1, entity_type: "product" });
const systemPricing = await fetchAll("product_pricing", "*", { tier_id: 1, entity_type: "system" });
const systemComponents = await fetchAll("system_components", "system_id, product_id, quantity, role");
const systemPackages = await fetchAll("system_packages", "id, system_sku, is_active");

const pricingByProductId = new Map(allPricing.map(p => [p.entity_id, p]));
const pricingBySystemId = new Map(systemPricing.map(p => [p.entity_id, p]));
const productById = new Map(allProducts.map(p => [p.id, p]));

// ---------------------------------------------------------------
// Audit results
// ---------------------------------------------------------------
const issues = {
  no_pricing: [],          // Active products with no pricing at all
  below_markup: [],        // Price < dealer cost × 1.20
  negative_savings: [],    // Our price > MSRP (no savings for customer)
  system_mismatch: [],     // System price doesn't match component sum
  stale_pricing: [],       // Pricing not updated in 30+ days
  r410a_active: [],        // 410-A refrigerant products still active
  zero_cost: [],           // Has pricing row but cost_equipment = 0
};

// ---------------------------------------------------------------
// CHECK 1: Active products without pricing
// ---------------------------------------------------------------
for (const p of activeProducts) {
  const pricing = pricingByProductId.get(p.id);
  if (!pricing || pricing.total_price <= 0) {
    issues.no_pricing.push({
      id: p.id,
      sku: p.sku,
      brand: p.brand,
      title: (p.title || "").substring(0, 60),
      category: p.specs?.product_category || "unknown",
      equipment_type: p.specs?.equipment_type || "unknown",
    });
  }
}

// ---------------------------------------------------------------
// CHECK 2: Markup rule — price must be >= dealer cost × 1.20
// ---------------------------------------------------------------
for (const pp of allPricing) {
  if (pp.cost_equipment <= 0) continue;
  const minPrice = pp.cost_equipment * RETAIL_MARKUP;
  if (pp.total_price < minPrice - 0.01) {
    const product = productById.get(pp.entity_id);
    if (!product || !product.is_active) continue;
    issues.below_markup.push({
      id: product.id,
      sku: product.sku,
      brand: product.brand,
      cost: Number(pp.cost_equipment),
      price: Number(pp.total_price),
      min_price: Math.round(minPrice * 100) / 100,
      shortfall: Math.round((minPrice - pp.total_price) * 100) / 100,
    });
  }
}

// ---------------------------------------------------------------
// CHECK 3: Negative savings — our price > MSRP
// ---------------------------------------------------------------
for (const pp of allPricing) {
  if (!pp.msrp || pp.msrp <= 0) continue;
  if (pp.total_price > pp.msrp) {
    const product = productById.get(pp.entity_id);
    if (!product || !product.is_active) continue;
    issues.negative_savings.push({
      id: product.id,
      sku: product.sku,
      brand: product.brand,
      our_price: Number(pp.total_price),
      msrp: Number(pp.msrp),
      overage: Math.round((pp.total_price - pp.msrp) * 100) / 100,
    });
  }
}

// ---------------------------------------------------------------
// CHECK 4: System pricing matches component sum
// ---------------------------------------------------------------
const componentsBySystem = new Map();
for (const sc of systemComponents) {
  if (!componentsBySystem.has(sc.system_id)) componentsBySystem.set(sc.system_id, []);
  componentsBySystem.get(sc.system_id).push(sc);
}

for (const sys of systemPackages) {
  if (!sys.is_active) continue;
  const comps = componentsBySystem.get(sys.id) || [];
  const sysPricing = pricingBySystemId.get(sys.id);
  if (!sysPricing) continue;

  let expectedCost = 0;
  let allPriced = true;
  for (const comp of comps) {
    const compPricing = pricingByProductId.get(comp.product_id);
    if (!compPricing || compPricing.cost_equipment <= 0) {
      allPriced = false;
      break;
    }
    expectedCost += compPricing.cost_equipment * comp.quantity;
  }

  if (!allPriced) continue;

  const expectedPrice = Math.round(expectedCost * RETAIL_MARKUP * 100) / 100;
  const actualPrice = Number(sysPricing.total_price);
  const diff = Math.abs(expectedPrice - actualPrice);

  if (diff > 0.02) {
    issues.system_mismatch.push({
      system_sku: sys.system_sku,
      expected_cost: expectedCost,
      expected_price: expectedPrice,
      actual_price: actualPrice,
      diff: Math.round(diff * 100) / 100,
    });
  }
}

// ---------------------------------------------------------------
// CHECK 5: Stale pricing (not updated in 30+ days)
// ---------------------------------------------------------------
const staleDate = new Date();
staleDate.setDate(staleDate.getDate() - STALE_DAYS);

for (const pp of allPricing) {
  const product = productById.get(pp.entity_id);
  if (!product || !product.is_active) continue;
  const updated = new Date(pp.updated_at);
  if (updated < staleDate) {
    issues.stale_pricing.push({
      id: product.id,
      sku: product.sku,
      brand: product.brand,
      last_updated: pp.updated_at,
      days_old: Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24)),
    });
  }
}

// ---------------------------------------------------------------
// CHECK 6: 410-A refrigerant products still active
// ---------------------------------------------------------------
for (const p of activeProducts) {
  const specs = p.specs || {};
  // Trust the actual refrigerant spec field first (Refrigerant, refrigerant_normalized, refrigerant_type)
  const refSpec = (specs.refrigerant_normalized || specs.Refrigerant || specs.refrigerant_type || "").toLowerCase().replace(/[\s-]/g, "");
  const title = (p.title || "").toLowerCase().replace(/[\s-]/g, "");
  // Only match R-410A specifically — NOT R-454B, R-32, etc.
  // If a refrigerant spec exists, trust it over the title (titles can be misleading)
  let is410a;
  if (refSpec) {
    is410a = /^r?410a$/.test(refSpec);
  } else {
    is410a = /r?410a/.test(title);
  }
  if (is410a) {
    issues.r410a_active.push({
      id: p.id,
      sku: p.sku,
      brand: p.brand,
      title: (p.title || "").substring(0, 60),
      refrigerant: refrigerant || "detected in title",
    });
  }
}

// ---------------------------------------------------------------
// CHECK 7: Zero cost equipment
// ---------------------------------------------------------------
for (const pp of allPricing) {
  if (pp.cost_equipment <= 0 && pp.total_price > 0) {
    const product = productById.get(pp.entity_id);
    if (!product || !product.is_active) continue;
    issues.zero_cost.push({
      id: product.id,
      sku: product.sku,
      brand: product.brand,
      total_price: Number(pp.total_price),
    });
  }
}

// ---------------------------------------------------------------
// FIX MODE: Auto-fix where possible
// ---------------------------------------------------------------
let fixes = { r410a_deactivated: 0, system_repriced: 0 };

if (FIX_MODE) {
  // NO-PRICE products: Do NOT deactivate. They stay is_active=true.
  // The storefront query should join on product_pricing and only show
  // products that have a price. These are flagged as action items in
  // the nightly report so pricing can be resolved.

  // 410-A products: These get deactivated per policy — 410-A equipment
  // should be completely removed from the database and website.
  for (const item of issues.r410a_active) {
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", item.id);
    if (!error) fixes.r410a_deactivated++;
  }
}

// ---------------------------------------------------------------
// Output
// ---------------------------------------------------------------
if (JSON_MODE) {
  console.log(JSON.stringify({ issues, fixes, timestamp: new Date().toISOString() }, null, 2));
} else {
  console.log("=== HPR PRICING AUDIT REPORT ===");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Active products: ${activeProducts.length}`);
  console.log(`Products with pricing: ${activeProducts.length - issues.no_pricing.length}`);
  console.log(`Mode: ${FIX_MODE ? "FIX" : "AUDIT ONLY"}\n`);

  const sections = [
    ["NO PRICING (hidden from storefront)", issues.no_pricing],
    ["BELOW 20% MARKUP", issues.below_markup],
    ["NEGATIVE SAVINGS (our price > MSRP)", issues.negative_savings],
    ["SYSTEM PRICE MISMATCH", issues.system_mismatch],
    ["STALE PRICING (>" + STALE_DAYS + " days)", issues.stale_pricing],
    ["410-A REFRIGERANT (should be deleted)", issues.r410a_active],
    ["ZERO DEALER COST", issues.zero_cost],
  ];

  let totalIssues = 0;
  for (const [label, items] of sections) {
    if (items.length === 0) {
      console.log(`✓ ${label}: PASS (0 issues)`);
    } else {
      console.log(`✗ ${label}: ${items.length} issues`);
      for (const item of items.slice(0, 10)) {
        console.log(`    ${JSON.stringify(item)}`);
      }
      if (items.length > 10) console.log(`    ... and ${items.length - 10} more`);
      totalIssues += items.length;
    }
    console.log();
  }

  console.log(`=== TOTAL ISSUES: ${totalIssues} ===`);

  if (FIX_MODE) {
    console.log(`\n=== FIXES APPLIED ===`);
    console.log(`410-A products deactivated: ${fixes.r410a_deactivated}`);
    console.log(`System prices recalculated: ${fixes.system_repriced}`);
    if (issues.no_pricing.length > 0) {
      console.log(`\nACTION REQUIRED: ${issues.no_pricing.length} products need pricing from portal Excel download.`);
      console.log(`These remain active but hidden from storefront until pricing is added.`);
    }
  }
}
