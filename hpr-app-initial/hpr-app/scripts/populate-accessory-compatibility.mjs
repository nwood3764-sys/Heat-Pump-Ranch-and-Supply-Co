/**
 * populate-accessory-compatibility.mjs
 *
 * Populates the `accessory_compatibility` table by linking accessory products
 * to system packages based on tonnage/BTU matching and accessory category heuristics.
 *
 * Strategy:
 *   - Link accessories primarily to system_packages (the main purchasable unit)
 *   - Tonnage-dependent accessories (line sets, heater coils, heat kits) are
 *     matched to systems by tonnage
 *   - Universal accessories (pads, brackets, thermostats) link to all systems
 *   - The `notes` column stores the accessory category key for frontend grouping
 *
 * Usage:
 *   node scripts/populate-accessory-compatibility.mjs [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tcnkumgqfezttiqzxsan.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbmt1bWdxZmV6dHRpcXp4c2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM0MDQzMiwiZXhwIjoyMDkyOTE2NDMyfQ.eYbKyg1EKP83afWg0gy3JPKzS4FgL4nhwjSpr_zKm78";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DRY_RUN = process.argv.includes("--dry-run");
if (DRY_RUN) console.log("=== DRY RUN MODE ===\n");

// ---------------------------------------------------------------
// Helpers
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

/**
 * Accessory category definitions — maps category keys to title keyword patterns.
 * These align with the ACCESSORY_SUB_KEYWORDS in catalog/page.tsx.
 * Only include categories relevant to the "Choose Your Accessories" dropdown UI.
 */
const ACCESSORY_CATEGORIES = {
  "line-sets": {
    keywords: ["line set", "installation kit"],
    ruleType: "recommended",
    tonnageDependent: true,
    displayLabel: "Pre-charged Line Sets",
    sortOrder: 1,
  },
  "equipment-mounting": {
    keywords: ["equipment pad", "wall mount bracket", "riser"],
    ruleType: "optional",
    tonnageDependent: false,
    displayLabel: "Mounting Options",
    sortOrder: 2,
  },
  "heater-coils": {
    keywords: ["heater coil"],
    ruleType: "recommended",
    tonnageDependent: true,
    displayLabel: "Electric Heat Kit Options",
    sortOrder: 3,
  },
  "heat-kits": {
    keywords: ["heat kit", "electric heat kit", "fused heat kit"],
    ruleType: "recommended",
    tonnageDependent: true,
    displayLabel: "Electric Heat Kit Options",
    sortOrder: 3,
  },
  "thermostats": {
    keywords: ["thermostat", "cielo breez", "ion system control"],
    ruleType: "recommended",
    tonnageDependent: false,
    displayLabel: "Recommended: Wall-Mounted Thermostats",
    sortOrder: 4,
  },
  "condensate-management": {
    keywords: ["condensate", "drain"],
    ruleType: "optional",
    tonnageDependent: false,
    displayLabel: "Condensate Management",
    sortOrder: 5,
  },
};

/**
 * Extract tonnage from a system or product's specs or title.
 */
function extractTonnage(item) {
  const tonnages = new Set();

  if (item.specs) {
    const specs = typeof item.specs === "string" ? JSON.parse(item.specs) : item.specs;
    const tonKeys = ["tonnage", "cooling_tonnage", "nominal_tonnage", "tons"];
    for (const key of tonKeys) {
      if (specs[key]) {
        const val = parseFloat(specs[key]);
        if (val >= 1 && val <= 6) tonnages.add(val);
      }
    }
    const btuKeys = ["cooling_capacity", "cooling_btu", "capacity_btu"];
    for (const key of btuKeys) {
      if (specs[key]) {
        const btu = parseInt(specs[key], 10);
        if (btu >= 10000 && btu <= 80000) {
          tonnages.add(Math.round(btu / 12000));
        }
      }
    }
  }

  if (tonnages.size === 0) {
    const title = item.title || item.system_sku || "";
    const titleLower = title.toLowerCase();
    const tonMatch = titleLower.match(/(\d+(?:\.\d+)?)\s*(?:-\s*)?ton/);
    if (tonMatch) {
      const val = parseFloat(tonMatch[1]);
      if (val >= 1 && val <= 6) tonnages.add(val);
    }
    const btuMatch = titleLower.match(/(\d{2,3}),?(\d{3})\s*btu/);
    if (btuMatch) {
      const btu = parseInt(btuMatch[1] + btuMatch[2], 10);
      if (btu >= 10000 && btu <= 80000) {
        tonnages.add(Math.round(btu / 12000));
      }
    }
    // Model number patterns: ACIQ-24 (24 = 24000 BTU = 2 ton)
    const sku = item.system_sku || item.sku || "";
    const modelMatch = sku.match(/(?:ACIQ|ACiQ)-?(\d{2})/i);
    if (modelMatch) {
      const modelNum = parseInt(modelMatch[1], 10);
      if (modelNum >= 12 && modelNum <= 60 && modelNum % 6 === 0) {
        tonnages.add(modelNum / 12);
      }
    }
  }

  return tonnages.size > 0 ? [...tonnages] : null;
}

/**
 * Extract kW rating from an accessory title.
 */
function extractKw(title) {
  const match = title.match(/(\d+)\s*(?:kilo\s*watt|kw)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * kW to compatible tonnage ranges for heater coils/heat kits.
 */
function kwToCompatibleTonnages(kw) {
  if (!kw) return [2, 3, 4, 5];
  if (kw <= 5) return [1.5, 2];
  if (kw <= 8) return [2, 2.5, 3];
  if (kw <= 10) return [3, 3.5, 4];
  if (kw <= 15) return [4, 4.5, 5];
  return [5];
}

/**
 * Line set diameter to compatible tonnage ranges.
 */
function lineSetToCompatibleTonnages(title) {
  const lower = title.toLowerCase();
  if (lower.includes("3/8") && lower.includes("3/4")) {
    return [1.5, 2, 2.5, 3];
  }
  if (lower.includes("3/8") && lower.includes("7/8")) {
    return [3, 3.5, 4, 5];
  }
  return [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
}

/**
 * Categorize an accessory by matching its title against category keywords.
 */
function categorizeAccessory(accessory) {
  const titleLower = accessory.title.toLowerCase();
  for (const [catKey, catDef] of Object.entries(ACCESSORY_CATEGORIES)) {
    for (const kw of catDef.keywords) {
      if (titleLower.includes(kw.toLowerCase())) {
        return { category: catKey, ...catDef };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------

async function main() {
  console.log("Loading data...");

  const accessories = await fetchAll("products", "id, sku, title, specs, product_type", {
    product_type: "accessory",
    is_active: true,
  });
  console.log(`  Accessories: ${accessories.length}`);

  const systems = await fetchAll("system_packages", "id, system_sku, title, specs", {
    is_active: true,
  });
  console.log(`  Systems: ${systems.length}`);

  // Build tonnage map for systems
  const systemsByTonnage = new Map();
  const allSystemIds = systems.map((s) => s.id);

  for (const sys of systems) {
    const tonnages = extractTonnage(sys);
    if (tonnages) {
      for (const t of tonnages) {
        if (!systemsByTonnage.has(t)) systemsByTonnage.set(t, []);
        systemsByTonnage.get(t).push(sys.id);
      }
    }
  }

  console.log(`\nTonnage distribution (systems):`);
  for (const [t, ids] of [...systemsByTonnage.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${t} ton: ${ids.length} systems`);
  }

  // Build compatibility rows
  const rows = [];
  let uncategorized = 0;
  const categoryCounts = {};

  for (const acc of accessories) {
    const cat = categorizeAccessory(acc);
    if (!cat) {
      uncategorized++;
      continue;
    }

    categoryCounts[cat.category] = (categoryCounts[cat.category] || 0) + 1;

    let compatibleSystemIds = [];

    if (cat.tonnageDependent) {
      let compatTonnages;
      if (cat.category === "heater-coils" || cat.category === "heat-kits") {
        const kw = extractKw(acc.title);
        compatTonnages = kwToCompatibleTonnages(kw);
      } else if (cat.category === "line-sets") {
        compatTonnages = lineSetToCompatibleTonnages(acc.title);
      } else {
        compatTonnages = [2, 3, 4, 5];
      }

      for (const t of compatTonnages) {
        const sysIds = systemsByTonnage.get(t) || [];
        compatibleSystemIds.push(...sysIds);
      }
      compatibleSystemIds = [...new Set(compatibleSystemIds)];
    } else {
      compatibleSystemIds = allSystemIds;
    }

    for (const sysId of compatibleSystemIds) {
      rows.push({
        accessory_product_id: acc.id,
        compatible_product_id: null,
        compatible_system_id: sysId,
        rule_type: cat.ruleType,
        notes: cat.category,
      });
    }
  }

  console.log(`\nAccessories by category:`);
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${cat}: ${count} accessories`);
  }
  console.log(`  uncategorized (skipped): ${uncategorized}`);
  console.log(`\nTotal compatibility rows: ${rows.length}`);

  if (DRY_RUN) {
    console.log("\nSample rows (first 20):");
    for (const row of rows.slice(0, 20)) {
      console.log(`  Accessory ${row.accessory_product_id} → System ${row.compatible_system_id} [${row.rule_type}] (${row.notes})`);
    }
    console.log("\n=== DRY RUN COMPLETE — no data written ===");
    return;
  }

  // Write to database
  console.log("\nClearing existing accessory_compatibility rows...");
  const { error: delError } = await supabase
    .from("accessory_compatibility")
    .delete()
    .gt("id", 0);
  if (delError) {
    console.error("Failed to clear existing rows:", delError.message);
    process.exit(1);
  }

  // Insert in batches of 500
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("accessory_compatibility").insert(batch);
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n✓ Inserted ${inserted} accessory_compatibility rows`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
