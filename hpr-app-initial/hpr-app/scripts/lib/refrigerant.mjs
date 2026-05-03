/**
 * Refrigerant detection + filters.
 *
 * Deterministic model-number parsing for LG and ACiQ products.
 * Based on manufacturer naming conventions:
 *
 *   LG:   Prefix + suffix rules. ALL legacy prefixes (LMU, LS, LSN, LAN,
 *         LAU, LUU, LDN, LQN, ARNU, ARUV, ARUN, ARCN, ARUB) default to
 *         R-410A. R-32 is ONLY the new K-prefix series (KNU, KNM, KUM, KUB).
 *
 *   ACiQ: Positional parsing. Character 2 of model number determines
 *         refrigerant: "4" = R-410A, "5" = R-454B. Deterministic.
 *
 * Used by:
 *   - sync-aciq: exclude R-410A (legacy refrigerant, phased out 2025+)
 *   - sync-lg:   exclude R-410A, include only R-32
 */

// ─────────────────────────────────────────────────────────────────────────────
// TEXT-BASED PATTERNS (fallback for products with explicit refrigerant text)
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_PATTERNS = [
  { type: "R-454B", re: /\bR[-\s]?454[\s-]?B\b/i },
  { type: "R-32",   re: /\bR[-\s]?32\b/i },
  { type: "R-410A", re: /\bR[-\s]?410[\s-]?A?\b/i },
  { type: "R-22",   re: /\bR[-\s]?22\b/i },
];

// ─────────────────────────────────────────────────────────────────────────────
// LG MODEL NUMBER PARSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LG legacy prefixes — ALL are R-410A.
 * If a model starts with any of these, it's R-410A (confidence 0.85+).
 * Includes HV/HXV/HSP/HVP/HB/HVB suffixes which are R-410A inverter gen.
 */
const LG_LEGACY_PREFIXES = [
  "LMU",   // Multi-zone outdoor unit
  "LSN",   // Indoor unit (wall mount)
  "LSU",   // Outdoor unit (single zone)
  "LSC",   // Single-zone system
  "LAN",   // Art Cool indoor unit
  "LAU",   // Art Cool outdoor unit
  "LUU",   // Outdoor unit
  "LDN",   // Concealed duct indoor
  "LDU",   // Concealed duct outdoor
  "LCN",   // Ceiling cassette indoor
  "LCU",   // Ceiling cassette outdoor
  "LMN",   // Multi-zone indoor
  "LQN",   // Ceiling cassette (older)
  "ARNU",  // VRF indoor unit
  "ARUV",  // VRF outdoor unit
  "ARUN",  // VRF outdoor unit
  "ARCN",  // VRF concealed indoor
  "ARUB",  // VRF concealed indoor
];

/**
 * LG R-32 prefixes — the ONLY way to be R-32 for LG.
 * New generation K-prefix series + heat pump water heaters.
 */
const LG_R32_PREFIXES = [
  "KNU",   // Wall mount indoor (R-32)
  "KNM",   // Cassette/ducted indoor (R-32)
  "KUM",   // Multi-zone outdoor (R-32)
  "KUB",   // Single-zone outdoor (R-32)
  "APHWC", // Heat pump water heater (R-32)
];

/**
 * Detect refrigerant from LG model number.
 * Priority: R-32 K-prefix > Legacy prefix > suffix patterns > null
 */
function detectLgRefrigerant(model) {
  if (!model) return null;
  const normalized = model.toUpperCase().replace(/[-\s]/g, "");

  // RULE: R-32 K-prefix (highest priority for LG)
  for (const prefix of LG_R32_PREFIXES) {
    if (normalized.startsWith(prefix)) return "R-32";
  }

  // RULE: Legacy prefix = R-410A
  for (const prefix of LG_LEGACY_PREFIXES) {
    if (normalized.startsWith(prefix)) return "R-410A";
  }

  // RULE: 2-char prefix match (LS, LM, LA, LC, LD, LU without the third char)
  if (/^L[SMACDQU][A-Z]?\d/i.test(normalized)) return "R-410A";

  // RULE: R-410A suffixes (HV, HXV, HSP, HVP, HB, HVB within legacy models)
  // These are ALL R-410A inverter generation suffixes
  if (/H[VXSPB]/.test(normalized) && !normalized.startsWith("K")) return "R-410A";

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACIQ MODEL NUMBER PARSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ACiQ positional parsing. Model format:
 *   R [Refrigerant] [Type] [SEER] [Stage] [Capacity] [Feature] [Voltage] ...
 *
 * Character 2 determines refrigerant:
 *   "4" = R-410A
 *   "5" = R-454B
 *
 * This is deterministic — no guessing needed.
 */
function detectAciqRefrigerant(model) {
  if (!model) return null;
  const normalized = model.toUpperCase().replace(/[-\s]/g, "");

  // Must start with "R" followed by a digit
  if (!normalized.startsWith("R") || normalized.length < 2) return null;

  const refrigerantChar = normalized.charAt(1);
  if (refrigerantChar === "4") return "R-410A";
  if (refrigerantChar === "5") return "R-454B";

  // Unknown refrigerant code
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DETECTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} product - shape from the scraper:
 *   { title, modelNumber, sku, description, specs, brand }
 * @returns {string|null}
 */
export function detectRefrigerant(product) {
  if (!product) return null;

  // 1. Spec table — highest signal if "Refrigerant" field is present
  if (product.specs && typeof product.specs === "object") {
    for (const [k, v] of Object.entries(product.specs)) {
      if (v == null) continue;
      if (/refriger/i.test(k)) {
        const val = String(v);
        for (const p of TEXT_PATTERNS) {
          if (p.re.test(val)) return p.type;
        }
      }
    }
  }

  // 2. Model-number-based detection (deterministic)
  const modelToCheck = product.modelNumber || product.sku;
  if (modelToCheck) {
    // Try ACiQ positional parsing first (starts with R + digit)
    const normalized = modelToCheck.toUpperCase().replace(/[-\s]/g, "");
    if (normalized.startsWith("R") && /^\d/.test(normalized.charAt(1))) {
      const aciqResult = detectAciqRefrigerant(modelToCheck);
      if (aciqResult) return aciqResult;
    }

    // Try LG model parsing
    const lgResult = detectLgRefrigerant(modelToCheck);
    if (lgResult) return lgResult;
  }

  // 3. Text-based detection (fallback — scan title, description, etc.)
  const haystacks = [];
  if (product.title) haystacks.push(String(product.title));
  if (product.shortDescription) haystacks.push(String(product.shortDescription));
  if (product.description) haystacks.push(String(product.description));
  if (product.modelNumber) haystacks.push(String(product.modelNumber));
  if (product.sku) haystacks.push(String(product.sku));

  for (const text of haystacks) {
    for (const p of TEXT_PATTERNS) {
      if (p.re.test(text)) return p.type;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCLUSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the product should be DROPPED from the ACiQ feed.
 * Drop rules:
 *   1. Discontinued
 *   2. R-410A (char 2 = "4")
 */
export function shouldExcludeAciq(product) {
  if (isDiscontinued(product)) return true;
  if (detectRefrigerant(product) === "R-410A") return true;
  return false;
}

/**
 * Returns true if the product should be DROPPED from the LG feed.
 * Drop rules:
 *   1. Discontinued
 *   2. R-410A (legacy prefix/suffix)
 *   3. R-22 (ancient)
 *
 * ONLY R-32 (K-prefix) and unknown models are kept.
 * Unknown is kept because some accessories/parts don't have refrigerant
 * (e.g., APHWC water heater parts, line sets, etc.)
 */
export function shouldExcludeLg(product) {
  if (isDiscontinued(product)) return true;
  const r = detectRefrigerant(product);
  if (r === "R-410A" || r === "R-22") return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCONTINUED DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const DISCONTINUED_RE = /\b(discontinu(?:ed|ing|ation|ous)?|obsolete|superseded|end[-\s]of[-\s]life|EOL|no longer (?:available|produced|made))\b/i;

function isDiscontinued(product) {
  if (!product) return false;
  if (product.title && DISCONTINUED_RE.test(product.title)) return true;
  if (product.shortDescription && DISCONTINUED_RE.test(product.shortDescription)) return true;
  if (product.description && DISCONTINUED_RE.test(product.description)) return true;
  if (product.specs && typeof product.specs === "object") {
    for (const [k, v] of Object.entries(product.specs)) {
      const s = `${k} ${v ?? ""}`;
      if (DISCONTINUED_RE.test(s)) return true;
      if (/^(product[\s_-]*)?status$/i.test(k)) {
        const val = String(v ?? "").trim().toLowerCase();
        if (val && val !== "active" && val !== "current") return true;
      }
      if (/^active$/i.test(k)) {
        const val = String(v ?? "").trim().toLowerCase();
        if (val === "false" || val === "no" || val === "0" || val === "n") return true;
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stamp the detected refrigerant into the product's specs map.
 */
export function stampRefrigerant(product) {
  const r = detectRefrigerant(product);
  if (!r) return product;
  product.specs = product.specs ?? {};
  product.specs.refrigerant_normalized = r;
  return product;
}
