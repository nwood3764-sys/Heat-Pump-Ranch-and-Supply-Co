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
 *   product_category — "complete-systems" | "individual-equipment" | "accessories-parts"
 *   equipment_type  — "outdoor-unit" | "indoor-unit" |
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
  const sku = (specs.SKU ?? specs.sku ?? title ?? "").toUpperCase().trim();

  // ---- system_type --------------------------------------------------------
  if (!specs.system_type) {
    // Water heater detection — check first since these are a distinct product type
    if (
      /\bwater\s*heater\b/.test(t) ||
      /^APHWC/.test(sku) ||
      /^PHDCLA/.test(sku) ||
      /^R5TT/.test(sku) ||
      cat.includes("water-heater")
    ) {
      specs.system_type = "water-heater";
    }
    // LG model number patterns for system_type
    else if (/^KUM/.test(sku) || /^KUS/.test(sku)) {
      specs.system_type = "non-ducted"; // KUM=multi-zone, KUS=single-zone mini split systems
    } else if (/^KNU/.test(sku) || /^KNS/.test(sku)) {
      specs.system_type = "non-ducted"; // KNU=outdoor, KNS=indoor mini split units
    } else if (/^LSN/.test(sku) || /^LQN/.test(sku) || /^LD[0-9N]/.test(sku)) {
      specs.system_type = "non-ducted"; // LSN=wall mount, LQN=cassette, LD/LDN=concealed duct
    } else if (/^LVN/.test(sku) || /^LNA/.test(sku)) {
      specs.system_type = "non-ducted"; // LVN/LNA=outdoor VRF/Multi V units
    } else if (/^LAN/.test(sku)) {
      specs.system_type = "ducted"; // LAN=indoor air handlers
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
    // LG model number patterns for equipment_type
    if (/^KUM/.test(sku)) {
      specs.equipment_type = "outdoor-unit"; // Multi-zone systems listed as outdoor unit
    } else if (/^KUS/.test(sku)) {
      specs.equipment_type = "indoor-unit"; // Single-zone systems
    } else if (/^KNU/.test(sku) || /^LVN/.test(sku) || /^LNA/.test(sku)) {
      specs.equipment_type = "outdoor-unit"; // Individual outdoor units / VRF
    } else if (/^KNS/.test(sku) || /^LSN/.test(sku)) {
      specs.equipment_type = "indoor-unit"; // Individual indoor wall mount units
    } else if (/^LQN/.test(sku)) {
      specs.equipment_type = "indoor-unit"; // Ceiling cassettes
      if (!specs.mount_type) specs.mount_type = "ceiling-cassette";
    } else if (/^LD[0-9N]/.test(sku)) {
      specs.equipment_type = "indoor-unit"; // Concealed duct
      if (!specs.mount_type) specs.mount_type = "concealed-duct";
    } else if (/^LAN/.test(sku)) {
      specs.equipment_type = "indoor-air-handler"; // Air handlers
    }
    // Individual outdoor unit (condenser only, no indoor component in title)
    else if (
      (/\bcondenser\b/.test(t) || /\boutdoor\s*unit\b/.test(t)) &&
      !/\bsystem\b/.test(t) && !/\bsplit\s*system\b/.test(t)
    ) {
      specs.equipment_type = "outdoor-unit";
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
      !/\boutdoor\b/.test(t) &&
      !/\bsystem\b/.test(t)
    ) {
      // Individual non-ducted indoor unit (wall mount, cassette, floor, concealed)
      specs.equipment_type = "indoor-unit";
    } else if (
      specs.system_type === "ducted" &&
      (/\bsplit\s*system\b/.test(t) || /\bcentral\s*(heat\s*pump|air)\b/.test(t))
    ) {
      // Ducted split systems / central heat pumps — complete systems
      specs.equipment_type = "outdoor-unit";
    } else if (
      specs.system_type === "non-ducted" &&
      /\bsystem\b/.test(t)
    ) {
      // Non-ducted complete systems (mini split systems)
      specs.equipment_type = "indoor-unit";
    }
  }

  // ---- product_category -----------------------------------------------------
  if (!specs.product_category) {
    if (specs.system_type === "water-heater") {
      specs.product_category = "complete-systems";
    } else if (
      /\bsystem\b/.test(t) ||
      /\bsplit\s*system\b/.test(t) ||
      /\bpackage\b/.test(t) ||
      /\bkit\b/.test(t) ||
      /\bbundle\b/.test(t)
    ) {
      specs.product_category = "complete-systems";
    } else if (
      specs.equipment_type === "outdoor-unit" ||
      specs.equipment_type === "indoor-unit" ||
      specs.equipment_type === "indoor-air-handler" ||
      specs.equipment_type === "indoor-cased-coil" ||
      specs.equipment_type === "indoor-furnace"
    ) {
      specs.product_category = "individual-equipment";
    } else {
      // Default: if it has a system_type, it's likely a complete system
      specs.product_category = specs.system_type ? "complete-systems" : undefined;
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
