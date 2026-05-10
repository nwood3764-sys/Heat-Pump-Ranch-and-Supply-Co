/**
 * Shared utility for filtering and cleaning product/system specs for display.
 *
 * The specs JSONB column contains both user-facing specs (SEER2, BTU, etc.)
 * and internal bookkeeping fields (source_origin, all_skus, etc.).
 * This module normalises duplicates, removes internal fields, and formats
 * the remaining entries for the specs table UI.
 */

/** Fields that should never appear in the customer-facing specs table. */
const HIDDEN_FIELDS = new Set([
  "all_skus",
  "hvacdirect_breadcrumbs",
  "source_origin",
  "product_category",
  "SKU",                    // redundant — already shown in the page header
]);

/**
 * Normalised key → preferred display label.
 * When both a snake_case internal key and a human-readable key exist
 * for the same concept, we keep only the human-readable one.
 * The snake_case variant is suppressed.
 */
const DUPLICATE_SUPPRESS: Record<string, string> = {
  // snake_case key → the "real" display key it duplicates
  seer2: "SEER2 (Efficiency)",
  cooling_btu: "Cooling BTU",
  heating_btu: "Heating BTU",
  energy_star: "Energy Star",
  cold_climate: "Cold Climate",
  zone_type: "Zone Compatibility",
  mount_type: "Mini Split Type",
  system_type: "System Type",       // keep as-is if no duplicate
  equipment_type: "Equipment Type", // keep as-is if no duplicate
  voltage: "Electrical",
  refrigerant_normalized: "Refrigerant",
};

/**
 * Labels that should be title-cased for display.
 * Keys that are already in a human-readable format (e.g., "SEER2 (Efficiency)")
 * are left as-is.
 */
function formatLabel(key: string): string {
  // If the key contains uppercase letters or parentheses, it's already formatted
  if (/[A-Z]/.test(key) || key.includes("(")) return key;
  // Convert snake_case to Title Case
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Filter and clean spec entries for display in the product/system detail page.
 *
 * @param specs - The raw specs JSONB object from the database
 * @returns Sorted array of [displayLabel, value] pairs
 */
export function cleanSpecEntries(
  specs: Record<string, unknown>,
): [string, string][] {
  const keys = Object.keys(specs);
  const keySet = new Set(keys);

  return Object.entries(specs)
    .filter(([k, v]) => {
      // Remove hidden internal fields
      if (HIDDEN_FIELDS.has(k)) return false;
      // Remove null/undefined/object values
      if (v === null || v === undefined) return false;
      if (typeof v === "object") return false;

      // Suppress snake_case duplicates when the human-readable version exists
      const preferred = DUPLICATE_SUPPRESS[k];
      if (preferred && keySet.has(preferred)) return false;

      return true;
    })
    .map(([k, v]) => [formatLabel(k), String(v)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b));
}
