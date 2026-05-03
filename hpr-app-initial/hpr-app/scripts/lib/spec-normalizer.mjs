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

  // For multi-zone combined SKUs like "KUMXA181A / 2-KNMAB071A", use the
  // first component as the primary model for prefix matching.
  const primaryModel = sku.split(/\s*\/\s*/)[0].replace(/^\d+-/, "");

  // ---- equipment_type (derive FIRST — other fields depend on it) ----------
  if (!specs.equipment_type) {
    // =================================================================
    //  LG MODEL-NUMBER RULES
    // =================================================================

    // --- LG: Multi V indoor units (ARNU / ZRNU prefix) ---
    if (/^(ARNU|ZRNU)/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- LG: Multi V S outdoor units (ARUN / ZRUN / ZRUM) ---
    else if (/^(ARUN|ZRUN|ZRUM)/.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- LG: Multi F outdoor unit (LMU) ---
    else if (/^LMU/.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- LG: LNAEA / LNAVE outdoor units ---
    else if (/^LNA[EV]/.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- LG: KPHTC = AWHP Monobloc (outdoor unit) ---
    else if (/^KPHTC/.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- LG K-series: KUMX* = multi-zone individual outdoor unit ---
    else if (/^KUMX/.test(primaryModel)) {
      if (sku.includes(" / ")) {
        specs.equipment_type = "indoor-unit"; // Combined system
      } else {
        specs.equipment_type = "outdoor-unit";
      }
    }
    // --- LG K-series: KUSX* = single-zone individual outdoor unit ---
    else if (/^KUSX/.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- LG K-series: KUS (without X) = complete single-zone system ---
    else if (/^KUS[ABCAELP]/.test(primaryModel) && !/^KUSX/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- LG K-series: KNM* = multi-zone indoor unit ---
    else if (/^KNM/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- LG K-series: KNS* = single-zone indoor unit ---
    else if (/^KNS/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- LG K-series: KNU outdoor variants (KNUAK, KNUQB) ---
    else if (/^KNU[AQ][KB]/.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- LG K-series: KNU indoor variants (KNUAB, KNUDB, KNUFB, KNUJB) ---
    else if (/^KNU/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- LG K-series: KSS* = single-zone system (complete) ---
    else if (/^KSS/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- LG: LAN* = indoor air handler ---
    else if (/^LAN/.test(primaryModel)) {
      specs.equipment_type = "indoor-air-handler";
    }
    // --- LG: LKMMA = indoor cased coil (A-coil) ---
    else if (/^LKMMA/.test(primaryModel)) {
      specs.equipment_type = "indoor-cased-coil";
    }
    // --- LG: Individual indoor units (N suffix pattern) ---
    else if (/^LSN/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    else if (/^LCN/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    else if (/^LQN/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    else if (/^LDN/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    else if (/^LHN/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    else if (/^LVN/.test(primaryModel)) {
      specs.equipment_type = "indoor-air-handler";
    }
    // --- LG: Individual outdoor units (U suffix pattern) ---
    else if (/^(LSU|LUU|LAU|LVU)/.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- LG: LMCN / LMAN = multi-zone indoor ---
    else if (/^(LMCN|LMAN)/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- LG: Complete systems (L + type char + digit, no N/U suffix) ---
    else if (/^L[SCDHLVAQ]\d/.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- LG: Water heaters (APHWC, R5TT) ---
    else if (/^(APHWC|R5TT)/.test(primaryModel)) {
      specs.equipment_type = "water-heater";
      specs.product_category = "water-heaters";
      specs.system_type = "water-heater";
    }
    // --- LG: Water heater accessories (PHDCLA = drain pan) ---
    else if (/^PHDCLA/.test(primaryModel)) {
      // Accessory for water heaters — skip equipment_type
      specs.system_type = "water-heater";
    }
    // --- LG: ERV / DOAS / Hydro kit (accessories) ---
    else if (/^(ARV|ARVU|ARND|ARNH)/.test(primaryModel)) {
      // Specialty — skip equipment_type (will become accessory)
    }
    // --- LG: Accessories ---
    else if (/^(P[A-Z]|AY|ARBL|ARCN|ANEH|PT-|ABDAMA|VCM|VUCQ|SEDC|LAMI|LAMU|LBRC|ZSMAC|ZVRC|ZX|ZFBX|ZLAB|ZRTB|ZWPR|ZCC|ZCE|ZCM|ZCP|PMBD|PWFCK|PWFMD|PWLSS|PZCWR|PVDAT)/.test(primaryModel)) {
      // Accessories — skip equipment_type
    }

    // =================================================================
    //  ACiQ MODEL-NUMBER RULES
    // =================================================================

    // --- ACiQ: Single-zone outdoor condensers (ACIQ-XXZ-HP / ACIQ-XXZS-HP) ---
    else if (/^ACIQ-\d+Z[S]?-HP/i.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- ACiQ: Extreme single-zone systems (ACIQ-XXZPL-HP) ---
    else if (/^ACIQ-\d+ZPL-HP/i.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- ACiQ: Central heat pump systems ---
    else if (/^ACIQ-\d+-?(EHPB|EHPD|HPD|HP-E|HP32|TD-HP)/i.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- ACiQ: AC condenser (ACIQ-XX-AC-B) ---
    else if (/^ACIQ-\d+-AC-B/i.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- ACiQ: Central ducted air handler (ACIQ-XX-AHD) ---
    else if (/^ACIQ-\d+-AHD/i.test(primaryModel)) {
      specs.equipment_type = "indoor-air-handler";
    }
    // --- ACiQ: Extreme+ ducted air handler (ACIQ-XX-PAH) ---
    else if (/^ACIQ-\d+-PAH/i.test(primaryModel)) {
      specs.equipment_type = "indoor-air-handler";
    }
    // --- ACiQ: Wall-mount air handler (ACIQ-XXW-WMB) ---
    else if (/^ACIQ-\d+W-WMB/i.test(primaryModel)) {
      specs.equipment_type = "indoor-air-handler";
    }
    // --- ACiQ: Mini split indoor heads (CC/CD/FM/W with HH or E suffix) ---
    else if (/^ACIQ-\d+(CC|CD|FM|W)-(HH|E)-M/i.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- ACiQ: Multi-zone systems (ACIQ-XXZ-HH-M or ACIQ-XXZ-E-M) ---
    else if (/^ACIQ-\d+Z-(HH|E)-M\d/i.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- ACiQ: Essentials outdoor condensers (ACIQ-K/KE + Z-HP) ---
    else if (/^ACIQ-K[E]?\d+Z-HP/i.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- ACiQ: Essentials wall mount indoor (ACIQ-K/KE + W) ---
    else if (/^ACIQ-K[E]?\d+W/i.test(primaryModel)) {
      specs.equipment_type = "indoor-air-handler";
    }
    // --- ACiQ: Standard/Extreme multi-zone systems (ES-XXZ-M) ---
    else if (/^ES-\d+Z-M/i.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- ACiQ: Slim ceiling cassette system (SCC-*) ---
    else if (/^SCC-/i.test(primaryModel)) {
      specs.equipment_type = "indoor-unit";
    }
    // --- ACiQ: R5H/R4H = heat pump outdoor ---
    else if (/^R[45]H/i.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- ACiQ: R5A/R4A = AC condenser outdoor ---
    else if (/^R[45]A/i.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- ACiQ: AQ-GLXS/GLXT = AC condenser outdoor ---
    else if (/^AQ-GLX[ST]/i.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- ACiQ: AQ-GLZS = heat pump condenser outdoor ---
    else if (/^AQ-GLZ/i.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }
    // --- ACiQ: AQ-AM = multi-positional air handler (indoor) ---
    else if (/^AQ-AM/i.test(primaryModel)) {
      specs.equipment_type = "indoor-air-handler";
    }
    // --- ACiQ: AQ-CAP/AQ-CAPT/AQ-CHPT = evaporator coil (indoor) ---
    else if (/^AQ-C[AH]P/i.test(primaryModel)) {
      specs.equipment_type = "indoor-cased-coil";
    }
    // --- ACiQ: EAM/EVD/EVM/END/ENH = evaporator coil (indoor) ---
    else if (/^(EAM|EVD|EVM|END|ENH)\d/i.test(primaryModel)) {
      specs.equipment_type = "indoor-cased-coil";
    }
    // --- ACiQ: FHMA/FTMA = multi-positional air handler (indoor) ---
    else if (/^(FHMA|FTMA)\d/i.test(primaryModel)) {
      specs.equipment_type = "indoor-air-handler";
    }
    // --- ACiQ: Electric furnace (ACIQ-EFL/EFS) ---
    else if (/^ACIQ-EF[LS]/i.test(primaryModel)) {
      specs.equipment_type = "indoor-furnace";
    }
    // --- ACiQ: Mobile home coils (ACiQ-XXUD) ---
    else if (/^ACIQ-\d+\d{2}UD/i.test(primaryModel)) {
      specs.equipment_type = "indoor-cased-coil";
    }
    // --- ACiQ: ACIQ-XX-ACL = evaporator cased coil ---
    else if (/^ACIQ-\d+-ACL/i.test(primaryModel)) {
      specs.equipment_type = "indoor-cased-coil";
    }
    // --- ACiQ: Electric heater coil (EHC) = accessory ---
    else if (/^EHC\d/i.test(primaryModel)) {
      // Accessory — skip equipment_type
    }
    // --- ACiQ: PTAC accessories ---
    else if (/^ACIQ-PTC/i.test(primaryModel) || /^T731W/i.test(primaryModel)) {
      // Accessory — skip equipment_type
    }
    // --- ACiQ: Scratch & dent variant SKUs ---
    else if (/^ACIQ\d+/i.test(primaryModel) && !/-/.test(primaryModel)) {
      if (/HPD/i.test(primaryModel)) specs.equipment_type = "outdoor-unit";
      else if (/AHD/i.test(primaryModel)) specs.equipment_type = "indoor-air-handler";
    }
    // --- ACiQ: ACiQ-XX-AHB (older heat pump system) ---
    else if (/^ACIQ-[0-9X]+-AHB/i.test(primaryModel)) {
      specs.equipment_type = "outdoor-unit";
    }

    // =================================================================
    //  GENERIC TITLE-BASED FALLBACKS
    // =================================================================
    else if (
      (/\bcondenser\b/.test(t) || /\boutdoor\s*unit\b/.test(t) || /\bodu\b/.test(t)) &&
      !/\bsystem\b/.test(t) && !/\bsplit\s*system\b/.test(t)
    ) {
      specs.equipment_type = "outdoor-unit";
    } else if (
      /\bair\s*handler\b/.test(t) || /\bair[\s-]handler\b/.test(t) ||
      /\bahu\b/.test(t) || /\bvahu\b/.test(t)
    ) {
      specs.equipment_type = "indoor-air-handler";
    } else if (
      /\bcased\s*coil\b/.test(t) || /\ba[\s-]?coil\b/.test(t) ||
      /\bevaporator\s*coil\b/.test(t) || /\bevaporator\s*cased\b/.test(t)
    ) {
      specs.equipment_type = "indoor-cased-coil";
    } else if (/\bfurnace\b/.test(t)) {
      specs.equipment_type = "indoor-furnace";
    }
  }

  // ---- system_type --------------------------------------------------------
  if (!specs.system_type) {
    // Water heater detection
    if (
      /\bwater\s*heater\b/.test(t) ||
      /^APHWC/.test(primaryModel) || /^PHDCLA/.test(primaryModel) ||
      /^R5TT/.test(primaryModel) || cat.includes("water-heater")
    ) {
      specs.system_type = "water-heater";
    }
    // Derive from equipment_type when possible
    else if (specs.equipment_type === "indoor-air-handler" ||
             specs.equipment_type === "indoor-cased-coil" ||
             specs.equipment_type === "indoor-furnace") {
      specs.system_type = "ducted";
    }
    // LG model patterns
    else if (/^(KUM|KUS|KNU|KNS|KNM)/.test(primaryModel)) {
      specs.system_type = "non-ducted";
    }
    else if (/^KSS/.test(primaryModel)) {
      if (/\bcassette\b/.test(t)) specs.system_type = "non-ducted";
      else if (/\bducted\b/.test(t) || /\bahu\b/.test(t)) specs.system_type = "ducted";
      else specs.system_type = "non-ducted";
    }
    else if (/^(LSN|LSU|LS\d)/.test(primaryModel)) specs.system_type = "non-ducted";
    else if (/^(LQN|LQ\d|LCN|LC\d)/.test(primaryModel)) specs.system_type = "non-ducted";
    else if (/^(LDN|LD\d)/.test(primaryModel)) specs.system_type = "non-ducted";
    else if (/^(LHN|LH\d)/.test(primaryModel)) specs.system_type = "ducted";
    else if (/^(LVN|LV\d|LVU|LUU)/.test(primaryModel)) specs.system_type = "ducted";
    else if (/^LAN/.test(primaryModel)) specs.system_type = "ducted";
    else if (/^LA\d/.test(primaryModel) || /^LAU/.test(primaryModel)) specs.system_type = "non-ducted";
    else if (/^(LMU|LMCN|LMAN)/.test(primaryModel)) specs.system_type = "non-ducted";
    else if (/^(ARNU|ZRNU)/.test(primaryModel)) {
      if (/\bducted\b/.test(t) || /\bahu\b/.test(t) || /\bair\s*handler\b/.test(t)) specs.system_type = "ducted";
      else specs.system_type = "non-ducted";
    }
    else if (/^(ARUN|ZRUN|ZRUM)/.test(primaryModel)) specs.system_type = "ducted";
    else if (/^(LNAE|LNAV)/.test(primaryModel)) specs.system_type = "ducted";
    else if (/^LKMMA/.test(primaryModel)) specs.system_type = "ducted";
    else if (/^KPHTC/.test(primaryModel)) specs.system_type = "ducted";
    // ACiQ patterns
    else if (/^ACIQ-\d+(CC|CD|FM|W)-(HH|E)/i.test(primaryModel) ||
             /^ACIQ-\d+Z[S]?-HP/i.test(primaryModel) ||
             /^ACIQ-\d+ZPL/i.test(primaryModel)) {
      specs.system_type = "non-ducted";
    }
    else if (/^ACIQ-\d+Z-(HH|E)-M\d/i.test(primaryModel) ||
             /^ES-\d+Z/i.test(primaryModel) ||
             /^SCC-/i.test(primaryModel)) {
      specs.system_type = "non-ducted";
    }
    else if (/^ACIQ-\d+-(EHPB|EHPD|HPD|HP-E|HP32|TD-HP|AHD|PAH)/i.test(primaryModel) ||
             /^ACIQ-\d+W-WMB/i.test(primaryModel)) {
      specs.system_type = "ducted";
    }
    else if (/^ACIQ-K/i.test(primaryModel)) specs.system_type = "non-ducted";
    else if (/^(R[45][AH]|AQ-GL)/i.test(primaryModel)) specs.system_type = "ducted";
    else if (/^(EAM|EVD|EVM|END|ENH|FHMA|FTMA|AQ-AM|AQ-C[AH]P)/i.test(primaryModel)) {
      specs.system_type = "ducted";
    }
    // Generic title-based fallbacks
    else if (/\bducted\b/.test(t) && !/\bductless\b/.test(t) &&
             !/\bnon[\s-]?ducted\b/.test(t) && !/\bmini[\s-]?split\b/.test(t)) {
      specs.system_type = "ducted";
    } else if (/\bductless\b/.test(t) || /\bmini[\s-]?split\b/.test(t) ||
               /\bnon[\s-]?ducted\b/.test(t) || /\bwall\s*mount\b/.test(t) ||
               /\bceiling\s*cassette\b/.test(t) || /\bfloor\s*mount\b/.test(t)) {
      specs.system_type = "non-ducted";
    } else if (cat.includes("mini-split") || cat.includes("ductless")) {
      specs.system_type = "non-ducted";
    } else if (cat.includes("air-handler") || cat.includes("furnace") ||
               cat.includes("coil") || cat.includes("heat-pump-system") ||
               cat.includes("heat-pump")) {
      specs.system_type = "ducted";
    }
  }

  // ---- product_category ---------------------------------------------------
  if (!specs.product_category) {
    if (specs.system_type === "water-heater") {
      specs.product_category = "complete-systems";
    }
    // LG complete systems
    else if (
      (/^KUS[ABCAELP]/.test(primaryModel) && !/^KUSX/.test(primaryModel)) ||
      (sku.includes(" / ")) ||
      /^KSS/.test(primaryModel) ||
      (/^L[SCDHLVAQ]\d/.test(primaryModel) && !/^L[SCDHLVAQ][NU]/.test(primaryModel))
    ) {
      specs.product_category = "complete-systems";
    }
    // ACiQ complete systems
    else if (
      /^ACIQ-\d+-(EHPB|EHPD|HPD|HP-E|HP32|TD-HP)/i.test(primaryModel) ||
      /^ACIQ-\d+ZPL/i.test(primaryModel) ||
      /^ACIQ-\d+Z-(HH|E)-M\d/i.test(primaryModel) ||
      /^ES-\d+Z/i.test(primaryModel) ||
      /^SCC-/i.test(primaryModel) ||
      /^R[45]H/i.test(primaryModel) ||
      /^AQ-GLZ/i.test(primaryModel)
    ) {
      specs.product_category = "complete-systems";
    }
    // Title-based system detection
    else if (/\bsystem\b/.test(t) || /\bsplit\s*system\b/.test(t) ||
             /\bpackage\b/.test(t) || /\bbundle\b/.test(t)) {
      specs.product_category = "complete-systems";
    }
    // Individual equipment
    else if (
      specs.equipment_type === "outdoor-unit" ||
      specs.equipment_type === "indoor-unit" ||
      specs.equipment_type === "indoor-air-handler" ||
      specs.equipment_type === "indoor-cased-coil" ||
      specs.equipment_type === "indoor-furnace"
    ) {
      specs.product_category = "individual-equipment";
    }
    // Accessories: anything without an equipment_type
    else if (!specs.equipment_type) {
      specs.product_category = "accessories-parts";
    }
    else {
      specs.product_category = specs.system_type ? "complete-systems" : undefined;
    }
  }

  // ---- mount_type ---------------------------------------------------------
  if (specs.mount_type) {
    const mt = specs.mount_type.toLowerCase();
    if (mt === "wall" || mt.includes("wall")) specs.mount_type = "wall-mount";
    else if (mt === "floor" || mt.includes("floor")) specs.mount_type = "floor-mount";
    else if (mt.includes("cassette") || mt.includes("ceiling")) specs.mount_type = "ceiling-cassette";
    else if (mt === "ducted" || mt.includes("concealed")) specs.mount_type = "concealed-duct";
    else if (mt.includes("multi")) specs.mount_type = "multi-position";
  }
  if (!specs.mount_type) {
    if (/\bwall\s*mount/i.test(t) || /\bwall\s*mounted/i.test(t)) specs.mount_type = "wall-mount";
    else if (/\bfloor\s*(mount|standing)/i.test(t)) specs.mount_type = "floor-mount";
    else if (/\b(ceiling\s*cassette|cassette|4[\s-]?way|2[\s-]?way|1[\s-]?way)/i.test(t)) specs.mount_type = "ceiling-cassette";
    else if (/\bconcealed\s*duct/i.test(t) || /\blow\s*static\s*ducted/i.test(t)) specs.mount_type = "concealed-duct";
    else if (/\bmulti[\s-]?position/i.test(t)) specs.mount_type = "multi-position";
    else if (/\b(mid\s*static|high\s*static)\s*ducted/i.test(t)) specs.mount_type = "concealed-duct";
    else if (/\blow\s*wall\s*console/i.test(t)) specs.mount_type = "floor-mount";
    else if (/\bvertical\s*a(ir\s*)?h(andler|u)/i.test(t) || /\bvahu\b/i.test(t)) specs.mount_type = "multi-position";
    // LG model-based mount type
    else if (/^(LSN|LS\d|KNSAE|KNSAC|KNSAL|KNSAP|KNSLE|KNMAB|KNUAB)/i.test(primaryModel)) specs.mount_type = "wall-mount";
    else if (/^(LCN|LC\d|KNMDB|KNMFB|KNUDB|KNUFB|KNSCB|KSSCB)/i.test(primaryModel)) specs.mount_type = "ceiling-cassette";
    else if (/^(LDN|LD\d|KNMKB)/i.test(primaryModel)) specs.mount_type = "concealed-duct";
    else if (/^(LHN|LH\d|KNSJB|KNUJB|KSSJB)/i.test(primaryModel)) specs.mount_type = "concealed-duct";
    else if (/^(LVN|LV\d|KNSLB|KNSLA|KNMLB)/i.test(primaryModel)) specs.mount_type = "multi-position";
    else if (/^LAN/i.test(primaryModel)) specs.mount_type = "multi-position";
    else if (/^(LQN|LQ\d|KNMQB)/i.test(primaryModel)) specs.mount_type = "floor-mount";
    else if (/^LKMMA/i.test(primaryModel)) specs.mount_type = "multi-position";
    // ACiQ model-based mount type
    else if (/W-WMB/i.test(sku) || /W-W-HP/i.test(sku)) specs.mount_type = "wall-mount";
    else if (/CC-HH|CC-/i.test(sku)) specs.mount_type = "ceiling-cassette";
    else if (/CD-HH|CD-/i.test(sku)) specs.mount_type = "concealed-duct";
    else if (/FM-HH|FM-/i.test(sku)) specs.mount_type = "floor-mount";
    else if (/W-(HH|E)-M/i.test(sku)) specs.mount_type = "wall-mount";
    else if (specs.system_type === "ducted" && specs.equipment_type === "indoor-air-handler") {
      specs.mount_type = "multi-position";
    }
  }

  // ---- cooling_btu / heating_btu ------------------------------------------
  if (!specs.cooling_btu) {
    const btuMatch = t.match(/([\d,]+)\s*btu/i);
    if (btuMatch) {
      const btu = parseInt(btuMatch[1].replace(/,/g, ""), 10);
      specs.cooling_btu = String(btu);
    } else {
      const tonMatch = t.match(/([\d.]+)\s*ton/i);
      if (tonMatch) {
        specs.cooling_btu = String(Math.round(parseFloat(tonMatch[1]) * 12000));
      } else if (specs.tonnage) {
        specs.cooling_btu = String(Math.round(parseFloat(specs.tonnage) * 12000));
      } else if (specs.btu) {
        specs.cooling_btu = String(specs.btu);
      } else {
        // LG model number BTU extraction
        // LG uses hundreds of BTU in model numbers:
        //   3-digit: e.g. LVN181 = 18,100 BTU ≈ 18k, ARNU093 = 9,300 BTU ≈ 9k
        //   2-digit: e.g. LS09 = 9k, LMU36 = 36k (these are in thousands)
        const lgBtuMatch3 = primaryModel.match(/(?:ARNU|ZRNU|ARUN|ZRUN|ZRUM|LSN|LSU|LCN|LDN|LHN|LVN|LAN|LAU|LUU|LVU|LMU|LMCN|LMAN|LQN|KNSLA|KNSLB|KNMAB|KNMDB|KNMFB|KNMKB|KNMQB|KNMLB|KNUAB|KNUDB|KNUFB|KNUJB|KNUAK|KNUQB)(\d{3})/i);
        if (lgBtuMatch3) {
          // 3-digit = hundreds of BTU, round to nearest thousand
          const hundreds = parseInt(lgBtuMatch3[1], 10);
          const btu = Math.round(hundreds / 10) * 1000; // 181 → 18k, 093 → 9k, 360 → 36k
          if (btu >= 5000 && btu <= 120000) {
            specs.cooling_btu = String(btu);
          }
        } else {
          const lgBtuMatch2 = primaryModel.match(/(?:LS|LC|LD|LH|LV|LA|LQ|LMU)(\d{2})\d/i);
          if (lgBtuMatch2) {
            const thousands = parseInt(lgBtuMatch2[1], 10);
            if (thousands >= 5 && thousands <= 120) {
              specs.cooling_btu = String(thousands * 1000);
            }
          }
        }
      }
    }
  }

  if (!specs.heating_btu) {
    for (const [key, val] of Object.entries(specs)) {
      const k = key.toLowerCase();
      if ((k.includes("heating") && k.includes("capacity")) ||
          (k.includes("heating") && k.includes("btu"))) {
        const match = String(val).match(/([\d,]+)/);
        if (match) {
          specs.heating_btu = String(parseInt(match[1].replace(/,/g, ""), 10));
          break;
        }
      }
    }
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
      /\bextreme\s*(series|heat|\+)\b/i.test(t) ||
      /\bextreme\+/i.test(t) ||
      /\b-13\s*°?\s*f\b/i.test(t) ||
      /\b-22\s*°?\s*f\b/i.test(t) ||
      /\bhyper[\s-]?heat\b/i.test(t) ||
      /\blgred/i.test(t) ||
      /HHV/i.test(primaryModel);
    specs.cold_climate = isColdClimate ? "yes" : "no";
  }

  // ---- zone_type ----------------------------------------------------------
  if (!specs.zone_type) {
    if (/\bsingle\s*zone\b/i.test(t)) specs.zone_type = "single";
    else if (/\bmulti[\s-]*zone\b/i.test(t) || /\bdual\s*zone\b/i.test(t) || /\btri\s*zone\b/i.test(t)) specs.zone_type = "multi";
    else if (/^(KUM|KNM|LMU)/.test(primaryModel)) specs.zone_type = "multi";
    else if (/^(KUS|KNS|KSS)/.test(primaryModel)) specs.zone_type = "single";
    else if (/Z-(HH|E)-M\d/i.test(sku) || /^ES-\d+Z-M\d/i.test(primaryModel)) specs.zone_type = "multi";
    else if (/Z[S]?-HP/i.test(sku) || /ZPL-HP/i.test(sku)) specs.zone_type = "single";
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
    const v = String(specs.voltage).replace(/\s/g, "");
    if (/^208/.test(v) || /^220/.test(v) || /^230/.test(v) || /^240/.test(v)) {
      specs.voltage = "208/230V";
    } else if (/^110/.test(v) || /^115/.test(v) || /^120/.test(v)) {
      specs.voltage = "115V";
    }
  }

  return specs;
}
