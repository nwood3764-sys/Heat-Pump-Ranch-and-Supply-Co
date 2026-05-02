/**
 * rebackfill-terminology.mjs
 *
 * Force re-normalization of filter fields to update terminology:
 *   - "outdoor-condenser" → "outdoor-unit"
 *   - "indoor-ductless-head" → "indoor-unit"
 *   - Populate product_category for all products (most will be "complete-systems")
 *
 * This script clears the affected fields before re-running normalizeSpecs
 * so the normalizer can re-derive them with the updated logic.
 *
 * Usage:
 *   node scripts/rebackfill-terminology.mjs
 *   node scripts/rebackfill-terminology.mjs --dry-run
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { normalizeSpecs } from "./lib/spec-normalizer.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const log = (...m) => console.error("[rebackfill]", ...m);

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch all active products
  const { data: products, error } = await supabase
    .from("products")
    .select("id, sku, title, specs, category_id")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) throw error;
  log(`Fetched ${products.length} products`);

  // Fetch categories for slug lookup
  const { data: categories } = await supabase.from("categories").select("id, slug");
  const catIdToSlug = new Map((categories ?? []).map((c) => [c.id, c.slug]));

  let updated = 0;
  let skipped = 0;

  // Fields to force re-derive
  const FIELDS_TO_CLEAR = [
    "equipment_type",
    "product_category",
    "system_type",
    "mount_type",
    "zone_type",
    "energy_star",
    "cold_climate",
    "cooling_btu",
    "heating_btu",
    "seer2",
    "voltage",
  ];

  for (const product of products) {
    const categorySlug = product.category_id
      ? catIdToSlug.get(product.category_id) ?? null
      : null;

    const oldSpecs = product.specs ?? {};
    const newSpecs = { ...oldSpecs };

    // Clear the filter fields so normalizer can re-derive them
    for (const field of FIELDS_TO_CLEAR) {
      delete newSpecs[field];
    }

    // Re-normalize
    normalizeSpecs(newSpecs, product.title, categorySlug);

    // Force product_category to "complete-systems" for all existing products
    // (since all 317 products in the DB are complete systems)
    if (!newSpecs.product_category) {
      newSpecs.product_category = "complete-systems";
    }

    // Check if anything changed
    const changed = JSON.stringify(newSpecs) !== JSON.stringify(oldSpecs);
    if (!changed) {
      skipped++;
      continue;
    }

    if (dryRun) {
      const diff = {};
      for (const [k, v] of Object.entries(newSpecs)) {
        if (oldSpecs[k] !== v) diff[k] = v;
      }
      if (Object.keys(diff).length > 0) {
        log(`  ${product.sku}: ${JSON.stringify(diff)}`);
      }
      updated++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("products")
      .update({ specs: newSpecs })
      .eq("id", product.id);

    if (updateErr) {
      log(`  FAIL ${product.sku}: ${updateErr.message}`);
    } else {
      updated++;
    }

    if (updated % 50 === 0) {
      log(`  progress: ${updated} updated, ${skipped} skipped`);
    }
  }

  log(`\n===== REBACKFILL ${dryRun ? "(DRY RUN) " : ""}COMPLETE =====`);
  log(`Updated: ${updated}`);
  log(`Skipped (no change): ${skipped}`);
  log(`Total: ${products.length}`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
