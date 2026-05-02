/**
 * spec-normalizer.mjs
 *
 * Normalizes raw scraped specs + product title into the canonical filter
 * fields used by the HPR storefront sidebar.
 *
 * Called from sync-aciq.mjs, sync-lg.mjs, and upload-portal-products.mjs
 * AFTER the raw specs object is assembled.
 *
 * Filter fields added to specs:
 *   system_type     — "ducted" | "non-ducted"
 *   equipment_type  — "outdoor-condenser" | "indoor-ductless-head" |
 *                     "indoor-air-handler" | "indoor-cased-coil" |
 *                     "indoor-furnace"
 *   mount_type      — "wall-mount" | "ceiling-cassette" | "floor-mount" |
 *                     "concealed-duct" | "multi-position"
 *   cooling_btu     — numeric string, e.g. "12000"
 *   heating_btu     — numeric string, e.g. "12000"
 *   energy_star     — "yes" | "no"
 *   cold_climate    — "yes" | "no"
 *   zone_type       — "single" | "multi"
 *   seer2           — numeric (float), e.g. 20
 *   voltage         — "115V" | "208/230V"
 */

/**
 * Normalize a raw specs object in-place, adding filter-ready fields.
 *
 * @param {Object} specs  — mutable specs object (will be modified)
 * @param {string} title  — product title / name
 * @param {string} [categorySlug] — category slug from breadcrumbs
 * @returns {Object} the same specs object, enriched
 */
export function normalizeSpecs(specs, title, categorySlug) {
  if (!specs) specs = {};
  const t = (title ?? "").toLowerCase();
  const cat = (categorySlug ?? "").toLowerCase();

  // ---- system_type --------------------------------------------------------
  if (!specs.system_type) {
    // Water heater detection — check first since these are a distinct product type
    const sku = (title ?? "").toUpperCase();
    if (
      /\bwater\s*heater\b/.test(t) ||
      /^APHWC/.test(sku) ||
      /^PHDCLA/.test(sku) ||
      /^R5TT/.test(sku) ||
      cat.includes("water-heater")
    ) {
      specs.system_type = "water-heater";
    } else if (
      /\bducted\b/.test(t) &&
      !/\bductless\b/.test(t) &&
      !/\bnon[\s-]?ducted\b/.test(t) &&
      !/\bmini[\s-]?split\b/.test(t)
    ) {
      specs.system_type = "ducted";
    } else if (
      /\bductless\b/.test(t) ||
      /\bmini[\s-]?split\b/.test(t) ||
      /\bnon[\s-]?ducted\b/.test(t) ||
      /\bwall\s*mount\b/.test(t) ||
      /\bceiling\s*cassette\b/.test(t) ||
      /\bfloor\s*mount\b/.test(t)
    ) {
      specs.system_type = "non-ducted";
    } else if (
      cat.includes("mini-split") ||
      cat.includes("ductless")
    ) {
      specs.system_type = "non-ducted";
    } else if (
      cat.includes("air-handler") ||
      cat.includes("furnace") ||
      cat.includes("coil") ||
      cat.includes("heat-pump-system") ||
      cat.includes("heat-pump")
    ) {
      specs.system_type = "ducted";
    }
  }

  // ---- equipment_type -----------------------------------------------------
  if (!specs.equipment_type) {
    if (/\bcondenser\b/.test(t) || /\boutdoor\s*unit\b/.test(t)) {
      specs.equipment_type = "outdoor-condenser";
    } else if (
      /\bair\s*handler\b/.test(t) ||
      /\bair[\s-]handler\b/.test(t)
    ) {
      specs.equipment_type = "indoor-air-handler";
    } else if (
      /\bcased\s*coil\b/.test(t) ||
      /\ba[\s-]?coil\b/.test(t) ||
      /\bevaporator\s*coil\b/.test(t)
    ) {
      specs.equipment_type = "indoor-cased-coil";
    } else if (/\bfurnace\b/.test(t)) {
      specs.equipment_type = "indoor-furnace";
    } else if (
      specs.system_type === "non-ducted" &&
      !/\bcondenser\b/.test(t) &&
      !/\boutdoor\b/.test(t)
    ) {
      // Non-ducted indoor units (wall mount, cassette, floor, concealed)
      specs.equipment_type = "indoor-ductless-head";
    } else if (
      specs.system_type === "ducted" &&
      (/\bsplit\s*system\b/.test(t) || /\bcentral\s*(heat\s*pump|air)\b/.test(t))
    ) {
      // Ducted split systems / central heat pumps are outdoor condensers
      specs.equipment_type = "outdoor-condenser";
    }
  }

  // ---- mount_type ---------------------------------------------------------
  // Normalize existing mount_type values to our canonical slugs
  if (specs.mount_type) {
    const mt = specs.mount_type.toLowerCase();
    if (mt === "wall" || mt.includes("wall")) specs.mount_type = "wall-mount";
    else if (mt === "floor" || mt.includes("floor")) specs.mount_type = "floor-mount";
    else if (mt.includes("cassette") || mt.includes("ceiling")) specs.mount_type = "ceiling-cassette";
    else if (mt === "ducted" || mt.includes("concealed")) specs.mount_type = "concealed-duct";
    else if (mt.includes("multi")) specs.mount_type = "multi-position";
  }
  // Infer from title if not set
  if (!specs.mount_type) {
    if (/\bwall\s*mount\b/i.test(t)) specs.mount_type = "wall-mount";
    else if (/\bfloor\s*mount\b/i.test(t)) specs.mount_type = "floor-mount";
    else if (/\bceiling\s*cassette\b/i.test(t)) specs.mount_type = "ceiling-cassette";
    else if (/\bconcealed\s*duct\b/i.test(t)) specs.mount_type = "concealed-duct";
    else if (/\bmulti[\s-]?position\b/i.test(t)) specs.mount_type = "multi-position";
    else if (specs.system_type === "ducted" && specs.equipment_type === "indoor-air-handler") {
      specs.mount_type = "multi-position";
    }
  }

  // ---- cooling_btu / heating_btu ------------------------------------------
  // Try to extract from title first, then from existing specs
  if (!specs.cooling_btu) {
    // Look for explicit "X BTU" pattern in title
    const btuMatch = t.match(/([\d,]+)\s*btu/i);
    if (btuMatch) {
      const btu = parseInt(btuMatch[1].replace(/,/g, ""), 10);
      specs.cooling_btu = String(btu);
    }
    // Fallback: derive from tonnage in title
    else {
      const tonMatch = t.match(/([\d.]+)\s*ton/i);
      if (tonMatch) {
        specs.cooling_btu = String(Math.round(parseFloat(tonMatch[1]) * 12000));
      }
      // Fallback: derive from existing tonnage spec
      else if (specs.tonnage) {
        specs.cooling_btu = String(Math.round(parseFloat(specs.tonnage) * 12000));
      }
      // Fallback: use existing btu field
      else if (specs.btu) {
        specs.cooling_btu = String(specs.btu);
      }
    }
  }

  // Heating BTU: check spec table keys first
  if (!specs.heating_btu) {
    // Look for "Heating Capacity" or "Heating BTU" in raw spec table values
    for (const [key, val] of Object.entries(specs)) {
      const k = key.toLowerCase();
      if (
        (k.includes("heating") && k.includes("capacity")) ||
        (k.includes("heating") && k.includes("btu"))
      ) {
        const match = String(val).match(/([\d,]+)/);
        if (match) {
          specs.heating_btu = String(parseInt(match[1].replace(/,/g, ""), 10));
          break;
        }
      }
    }
    // Fallback: use cooling BTU as rough estimate (many products list one BTU)
    if (!specs.heating_btu && specs.cooling_btu) {
      specs.heating_btu = specs.cooling_btu;
    }
  }

  // ---- energy_star --------------------------------------------------------
  if (!specs.energy_star) {
    const hasEnergyStar =
      /\benergy\s*star\b/i.test(t) ||
      Object.entries(specs).some(
        ([k, v]) =>
          /energy\s*star/i.test(k) ||
          (/energy\s*star/i.test(String(v)) && String(v).toLowerCase() !== "no"),
      );
    specs.energy_star = hasEnergyStar ? "yes" : "no";
  }

  // ---- cold_climate -------------------------------------------------------
  if (!specs.cold_climate) {
    const isColdClimate =
      /\bcold\s*climate\b/i.test(t) ||
      /\bextreme\s*(series|heat)\b/i.test(t) ||
      /\b-13\s*°?\s*f\b/i.test(t) ||
      /\b-22\s*°?\s*f\b/i.test(t) ||
      /\bhyper[\s-]?heat\b/i.test(t);
    specs.cold_climate = isColdClimate ? "yes" : "no";
  }

  // ---- zone_type ----------------------------------------------------------
  if (!specs.zone_type) {
    if (/\bsingle\s*zone\b/i.test(t)) specs.zone_type = "single";
    else if (/\bmulti[\s-]*zone\b/i.test(t)) specs.zone_type = "multi";
  }

  // ---- seer2 (normalize to number) ----------------------------------------
  if (!specs.seer2 || typeof specs.seer2 === "string") {
    const seerMatch = t.match(/([\d.]+)\s*seer2?/i);
    if (seerMatch) {
      specs.seer2 = parseFloat(seerMatch[1]);
    } else if (typeof specs.seer2 === "string") {
      const parsed = parseFloat(specs.seer2);
      if (!isNaN(parsed)) specs.seer2 = parsed;
    }
    // Also check raw spec table
    if (!specs.seer2) {
      for (const [key, val] of Object.entries(specs)) {
        if (/seer/i.test(key)) {
          const match = String(val).match(/([\d.]+)/);
          if (match) {
            specs.seer2 = parseFloat(match[1]);
            break;
          }
        }
      }
    }
  }

  // ---- voltage (normalize) ------------------------------------------------
  if (!specs.voltage) {
    const voltMatch = t.match(/(\d{3})\s*v\b/i);
    if (voltMatch) {
      const v = parseInt(voltMatch[1], 10);
      if (v >= 200 && v <= 240) specs.voltage = "208/230V";
      else if (v >= 110 && v <= 120) specs.voltage = "115V";
      else specs.voltage = `${v}V`;
    }
  } else {
    // Normalize existing voltage values
    const v = String(specs.voltage).replace(/\s/g, "");
    if (/^208/.test(v) || /^220/.test(v) || /^230/.test(v) || /^240/.test(v)) {
      specs.voltage = "208/230V";
    } else if (/^110/.test(v) || /^115/.test(v) || /^120/.test(v)) {
      specs.voltage = "115V";
    }
  }

  return specs;
}
