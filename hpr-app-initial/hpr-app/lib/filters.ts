/**
 * HPR Product Filter Schema
 *
 * Defines all filter groups, options, tooltip copy, and cascade rules.
 * Used by both the FilterSidebar client component and the catalog page
 * server component for query building.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterOption {
  value: string;
  label: string;
  /** Which system_type values this option is compatible with (for cascade) */
  compat?: string[];
}

export interface FilterGroup {
  key: string;
  label: string;
  tooltip: string;
  options: FilterOption[];
  /** If true, rendered with heavier border as a primary group */
  primary?: boolean;
}

// ---------------------------------------------------------------------------
// Filter definitions (order matters — rendered top to bottom)
// ---------------------------------------------------------------------------

export const FILTER_GROUPS: FilterGroup[] = [
  {
    key: "product_category",
    label: "Product Category",
    tooltip:
      "Are you looking for a complete ready-to-install system, or do you need a specific piece of equipment like an indoor unit or outdoor unit?",
    primary: true,
    options: [
      { value: "complete-systems", label: "Complete Systems" },
      { value: "individual-equipment", label: "Individual Equipment" },
      { value: "accessories-parts", label: "Accessories & Parts" },
    ],
  },
  {
    key: "system_type",
    label: "System Type",
    tooltip:
      "Ducted systems connect to your home\u2019s existing ductwork. Non-ducted (ductless) systems deliver air directly into the room \u2014 no ducts needed. Water heaters use heat pump technology to efficiently heat your home\u2019s water supply.",
    primary: true,
    options: [
      { value: "ducted", label: "Ducted" },
      { value: "non-ducted", label: "Non-Ducted" },
      { value: "water-heater", label: "Water Heater" },
    ],
  },
  {
    key: "equipment_type",
    label: "Equipment Type",
    tooltip:
      "Choose the specific component you need. Outdoor units sit outside your home and contain the compressor. Indoor units go inside and come in different styles depending on your setup.",
    options: [
      { value: "outdoor-unit", label: "Outdoor Unit", compat: ["ducted", "non-ducted"] },
      { value: "indoor-unit", label: "Indoor Unit", compat: ["non-ducted"] },
      { value: "indoor-air-handler", label: "Indoor Air Handler", compat: ["ducted"] },
      { value: "indoor-cased-coil", label: "Indoor Cased Coil (A-Coil)", compat: ["ducted"] },
      { value: "indoor-furnace", label: "Indoor Furnace", compat: ["ducted"] },
    ],
  },
  {
    key: "mount_type",
    label: "Mount Type",
    tooltip:
      "How will the indoor unit be installed? Wall mounts hang high on the wall. Ceiling cassettes sit flush in the ceiling. Floor mounts sit near the floor. Concealed duct units hide above the ceiling with short duct runs.",
    options: [
      { value: "wall-mount", label: "Wall Mount", compat: ["non-ducted"] },
      { value: "ceiling-cassette", label: "Ceiling Cassette", compat: ["non-ducted"] },
      { value: "floor-mount", label: "Floor Mount", compat: ["non-ducted"] },
      { value: "concealed-duct", label: "Concealed Duct", compat: ["non-ducted"] },
      { value: "multi-position", label: "Multi-Position", compat: ["ducted"] },
    ],
  },
  {
    key: "cooling_btu",
    label: "Cooling Capacity",
    tooltip:
      "The cooling output of the system measured in BTUs. Higher BTUs cool larger spaces. Tonnage is shown for quick reference \u2014 1 ton equals 12,000 BTU.",
    options: [
      { value: "9000", label: "9,000 BTU (0.75 Ton)" },
      { value: "12000", label: "12,000 BTU (1.0 Ton)" },
      { value: "18000", label: "18,000 BTU (1.5 Ton)" },
      { value: "24000", label: "24,000 BTU (2.0 Ton)" },
      { value: "30000", label: "30,000 BTU (2.5 Ton)" },
      { value: "36000", label: "36,000 BTU (3.0 Ton)" },
      { value: "42000", label: "42,000 BTU (3.5 Ton)" },
      { value: "48000", label: "48,000 BTU (4.0 Ton)" },
      { value: "60000", label: "60,000 BTU (5.0 Ton)" },
    ],
  },
  {
    key: "heating_btu",
    label: "Heating Capacity",
    tooltip:
      "The heating output measured in BTUs. Cold climate systems typically have higher heating BTUs for reliable warmth in extreme temperatures.",
    options: [
      { value: "9000", label: "9,000 BTU" },
      { value: "12000", label: "12,000 BTU" },
      { value: "18000", label: "18,000 BTU" },
      { value: "24000", label: "24,000 BTU" },
      { value: "30000", label: "30,000 BTU" },
      { value: "36000", label: "36,000 BTU" },
      { value: "48000", label: "48,000 BTU" },
      { value: "60000", label: "60,000 BTU" },
    ],
  },
  {
    key: "energy_star",
    label: "Energy Star",
    tooltip:
      "Energy Star certified products meet strict efficiency standards set by the EPA, which may qualify you for utility rebates and tax credits.",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "cold_climate",
    label: "Cold Climate",
    tooltip:
      "Cold climate systems are designed to provide reliable heating in extreme cold, often down to -13\u00b0F or -22\u00b0F. Ideal if you live in northern states or areas with harsh winters.",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "seer2",
    label: "SEER2 Rating",
    tooltip:
      "SEER2 measures cooling efficiency \u2014 the higher the number, the lower your energy bills. The federal minimum is 14 SEER2.",
    options: [
      { value: "14-16", label: "14 \u2013 16" },
      { value: "17-19", label: "17 \u2013 19" },
      { value: "20-22", label: "20 \u2013 22" },
      { value: "23+", label: "23+" },
    ],
  },
  {
    key: "zones",
    label: "Zones",
    tooltip:
      "Single zone systems heat and cool one room. Multi-zone systems use one outdoor unit to serve multiple rooms, each with its own temperature control.",
    options: [
      { value: "single", label: "Single Zone" },
      { value: "multi", label: "Multi Zone" },
    ],
  },
  {
    key: "brand",
    label: "Brand",
    tooltip: "Filter by manufacturer.",
    options: [
      { value: "ACiQ", label: "ACiQ" },
      { value: "LG", label: "LG" },
    ],
  },
  {
    key: "voltage",
    label: "Voltage",
    tooltip:
      "Make sure the voltage matches your electrical setup. Most homes have both 115V and 208/230V circuits. Larger systems typically require 208/230V.",
    options: [
      { value: "115V", label: "115V" },
      { value: "208/230V", label: "208/230V" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Cascade visibility rules
// ---------------------------------------------------------------------------

export type ActiveFilters = Record<string, Set<string>>;

/**
 * Given the current active filter selections, determine which filter groups
 * should be visible and which options within each group should be visible.
 *
 * Returns a map of groupKey -> Set of visible option values.
 * If a group key is absent from the map, the entire group is hidden.
 */
export function computeVisibleFilters(active: ActiveFilters): Record<string, Set<string> | "all"> {
  const vis: Record<string, Set<string> | "all"> = {};
  const productCat = active.product_category ?? new Set();
  const systemType = active.system_type ?? new Set();
  const equipType = active.equipment_type ?? new Set();

  const isAccessories = productCat.size === 1 && productCat.has("accessories-parts");
  const isCompleteSystems = productCat.size === 1 && productCat.has("complete-systems");
  const onlyDucted = systemType.size === 1 && systemType.has("ducted");
  const onlyNonDucted = systemType.size === 1 && systemType.has("non-ducted");
  const onlyWaterHeater = systemType.size === 1 && systemType.has("water-heater");
  const onlyOutdoor = equipType.size === 1 && equipType.has("outdoor-unit");

  // Always show product_category and brand
  vis.product_category = "all";
  vis.brand = "all";

  if (isAccessories) {
    // Only show brand + voltage for accessories
    vis.voltage = "all";
    return vis;
  }

  if (onlyWaterHeater) {
    // Water heaters only need brand, voltage, and energy star
    vis.system_type = "all";
    vis.energy_star = "all";
    vis.voltage = "all";
    return vis;
  }

  // System type always visible (unless accessories)
  vis.system_type = "all";

  // Equipment type: visible only when NOT "complete systems" only
  if (!isCompleteSystems) {
    const eqOpts = new Set<string>();
    for (const opt of FILTER_GROUPS.find((g) => g.key === "equipment_type")!.options) {
      if (!opt.compat) {
        eqOpts.add(opt.value);
      } else if (onlyDucted && opt.compat.includes("ducted")) {
        eqOpts.add(opt.value);
      } else if (onlyNonDucted && opt.compat.includes("non-ducted")) {
        eqOpts.add(opt.value);
      } else if (!onlyDucted && !onlyNonDucted) {
        eqOpts.add(opt.value);
      }
    }
    vis.equipment_type = eqOpts;
  }

  // Mount type: hidden if only outdoor condenser selected
  if (!onlyOutdoor) {
    const mtOpts = new Set<string>();
    for (const opt of FILTER_GROUPS.find((g) => g.key === "mount_type")!.options) {
      if (!opt.compat) {
        mtOpts.add(opt.value);
      } else if (onlyDucted && opt.compat.includes("ducted")) {
        mtOpts.add(opt.value);
      } else if (onlyNonDucted && opt.compat.includes("non-ducted")) {
        mtOpts.add(opt.value);
      } else if (!onlyDucted && !onlyNonDucted) {
        mtOpts.add(opt.value);
      }
    }
    vis.mount_type = mtOpts;
  }

  // Capacity, certifications, SEER2 always visible
  vis.cooling_btu = "all";
  vis.heating_btu = "all";
  vis.energy_star = "all";
  vis.cold_climate = "all";
  vis.seer2 = "all";

  // Zones: hidden for ducted-only
  if (!onlyDucted) {
    vis.zones = "all";
  }

  vis.voltage = "all";

  return vis;
}

// ---------------------------------------------------------------------------
// URL search param helpers
// ---------------------------------------------------------------------------

/**
 * Map category slugs to implied system_type so the sidebar cascade
 * auto-restricts when a user navigates via the category nav bar.
 */
const CATEGORY_SYSTEM_TYPE_MAP: Record<string, string> = {
  "mini-splits": "non-ducted",
  "heat-pumps": "ducted",
  "air-handlers": "ducted",
  "furnaces": "ducted",
  "air-conditioners": "ducted",
  "water-heaters": "water-heater",
};

/** Parse URL search params into ActiveFilters map */
export function parseFiltersFromParams(params: URLSearchParams): ActiveFilters {
  const active: ActiveFilters = {};
  for (const group of FILTER_GROUPS) {
    const raw = params.get(group.key);
    if (raw) {
      active[group.key] = new Set(raw.split(","));
    }
  }

  // If a category is set via nav bar and no explicit system_type filter,
  // inject the implied system_type so cascade rules apply correctly.
  const category = params.get("category");
  if (category && !active.system_type) {
    const implied = CATEGORY_SYSTEM_TYPE_MAP[category];
    if (implied) {
      active.system_type = new Set([implied]);
    }
  }

  return active;
}

/** Serialize ActiveFilters back to URLSearchParams entries */
export function filtersToParams(active: ActiveFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, values] of Object.entries(active)) {
    if (values.size > 0) {
      params[key] = Array.from(values).join(",");
    }
  }
  return params;
}
