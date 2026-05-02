/**
 * backfill-filter-specs.mjs
 *
 * One-time migration script to enrich existing products' specs JSONB
 * with the canonical filter fields (system_type, equipment_type,
 * mount_type, cooling_btu, heating_btu, energy_star, cold_climate,
 * zone_type, seer2, voltage).
 *
 * Safe to run multiple times — normalizeSpecs only fills fields that
 * are not already set.
 *
 * Usage:
 *   node scripts/backfill-filter-specs.mjs
 *   node scripts/backfill-filter-specs.mjs --dry-run
 *   node scripts/backfill-filter-specs.mjs --limit=10
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { normalizeSpecs } from "./lib/spec-normalizer.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

const log = (...m) => console.error("[backfill]", ...m);

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
  let query = supabase
    .from("products")
    .select("id, sku, title, specs, category_id")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data: products, error } = await query;
  if (error) throw error;
  log(`Fetched ${products.length} products`);

  // Fetch categories for slug lookup
  const { data: categories } = await supabase.from("categories").select("id, slug");
  const catIdToSlug = new Map((categories ?? []).map((c) => [c.id, c.slug]));

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const categorySlug = product.category_id
      ? catIdToSlug.get(product.category_id) ?? null
      : null;

    const oldSpecs = product.specs ?? {};
    const newSpecs = { ...oldSpecs };
    normalizeSpecs(newSpecs, product.title, categorySlug);

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
      log(`  ${product.sku}: would add ${JSON.stringify(diff)}`);
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

    if (updated % 100 === 0) {
      log(`  progress: ${updated} updated, ${skipped} skipped`);
    }
  }

  log(`\n===== BACKFILL ${dryRun ? "(DRY RUN) " : ""}COMPLETE =====`);
  log(`Updated: ${updated}`);
  log(`Skipped (no change): ${skipped}`);
  log(`Total: ${products.length}`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
