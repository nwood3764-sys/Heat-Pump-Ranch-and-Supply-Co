/**
 * Search Keyword Mapping
 *
 * Maps common natural-language search phrases to structured spec filters
 * so customers can search "water heater", "wall mount", "mini split", etc.
 * and get relevant results even when those exact words don't appear in
 * the product title or SKU.
 *
 * Each entry maps a phrase (checked against the full lowercased query)
 * to one or more spec key/value pairs that will be applied as OR filters.
 */

export interface KeywordMapping {
  /** Phrase to match (lowercased). Checked with includes(). */
  phrase: string;
  /** Spec filters to apply. Each entry is { specKey, specValues }. */
  filters: { specKey: string; specValues: string[] }[];
}

/**
 * Keyword-to-filter mappings. Order doesn't matter — all matching
 * phrases contribute filters. More specific phrases should be listed
 * first so they can be matched before generic ones.
 */
export const KEYWORD_MAPPINGS: KeywordMapping[] = [
  // System types
  {
    phrase: "water heater",
    filters: [{ specKey: "system_type", specValues: ["water-heater"] }],
  },
  {
    phrase: "hot water",
    filters: [{ specKey: "system_type", specValues: ["water-heater"] }],
  },
  {
    phrase: "mini split",
    filters: [{ specKey: "system_type", specValues: ["non-ducted"] }],
  },
  {
    phrase: "minisplit",
    filters: [{ specKey: "system_type", specValues: ["non-ducted"] }],
  },
  {
    phrase: "ductless",
    filters: [{ specKey: "system_type", specValues: ["non-ducted"] }],
  },
  {
    phrase: "ducted",
    filters: [{ specKey: "system_type", specValues: ["ducted"] }],
  },

  // Equipment types
  {
    phrase: "outdoor unit",
    filters: [{ specKey: "equipment_type", specValues: ["outdoor-unit"] }],
  },
  {
    phrase: "condenser",
    filters: [{ specKey: "equipment_type", specValues: ["outdoor-unit"] }],
  },
  {
    phrase: "indoor unit",
    filters: [{ specKey: "equipment_type", specValues: ["indoor-unit"] }],
  },
  {
    phrase: "air handler",
    filters: [{ specKey: "equipment_type", specValues: ["indoor-air-handler"] }],
  },
  {
    phrase: "a-coil",
    filters: [{ specKey: "equipment_type", specValues: ["indoor-cased-coil"] }],
  },
  {
    phrase: "cased coil",
    filters: [{ specKey: "equipment_type", specValues: ["indoor-cased-coil"] }],
  },
  {
    phrase: "furnace",
    filters: [{ specKey: "equipment_type", specValues: ["indoor-furnace"] }],
  },

  // Mount types
  {
    phrase: "wall mount",
    filters: [{ specKey: "mount_type", specValues: ["wall-mount"] }],
  },
  {
    phrase: "ceiling cassette",
    filters: [{ specKey: "mount_type", specValues: ["ceiling-cassette"] }],
  },
  {
    phrase: "floor mount",
    filters: [{ specKey: "mount_type", specValues: ["floor-mount"] }],
  },
  {
    phrase: "concealed duct",
    filters: [{ specKey: "mount_type", specValues: ["concealed-duct"] }],
  },

  // Zone types
  {
    phrase: "single zone",
    filters: [{ specKey: "zone_type", specValues: ["single"] }],
  },
  {
    phrase: "multi zone",
    filters: [{ specKey: "zone_type", specValues: ["multi"] }],
  },
  {
    phrase: "multi-zone",
    filters: [{ specKey: "zone_type", specValues: ["multi"] }],
  },

  // Certifications
  {
    phrase: "energy star",
    filters: [{ specKey: "energy_star", specValues: ["yes"] }],
  },
  {
    phrase: "cold climate",
    filters: [{ specKey: "cold_climate", specValues: ["yes"] }],
  },
];

/**
 * Given a raw search query string, find all matching keyword mappings
 * and return the combined spec filters to apply.
 */
export function resolveKeywordFilters(
  query: string
): { specKey: string; specValues: string[] }[] {
  const lower = query.toLowerCase();
  const filters: { specKey: string; specValues: string[] }[] = [];

  for (const mapping of KEYWORD_MAPPINGS) {
    if (lower.includes(mapping.phrase)) {
      filters.push(...mapping.filters);
    }
  }

  return filters;
}
