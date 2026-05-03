/**
 * Refrigerant detection + filters.
 *
 * Catalog source pages don't expose a normalized refrigerant field — it's
 * scattered across model number suffixes, spec table rows, and free-form
 * title/description text. This module looks at every available signal and
 * returns one of:
 *   "R-32" | "R-410A" | "R-454B" | "R-22" | null
 *
 * Used by:
 *   - sync-aciq: exclude R-410A (legacy refrigerant, phased out 2025+)
 *   - sync-lg:   include only R-32 (per business rules)
 */

const PATTERNS = [
  // Order matters: prefer the most specific match first so "R-454B" is not
  // mistakenly matched by a generic /R-?4/ pattern.
  { type: "R-454B", re: /\bR[-\s]?454[\s-]?B\b/i },
  { type: "R-32",   re: /\bR[-\s]?32\b/i },
  { type: "R-410A", re: /\bR[-\s]?410[\s-]?A?\b/i },
  { type: "R-22",   re: /\bR[-\s]?22\b/i },
];

/**
 * LG model-number-based refrigerant detection.
 *
 * LG's naming convention encodes refrigerant type:
 *   R-410A (old gen, phased out):
 *     - Indoor: LSN, LSC, LMN, LAN, LCN, LDN (without HV suffix)
 *     - Outdoor: LSU, LMU, LAU, LCU, LDU
 *     - Suffix "HE" = R-410A high efficiency
 *     - Suffix "HX" = R-410A extended pipe
 *     - Suffix "HS" = R-410A standard
 *     - Suffix "HY" = R-410A Art Cool
 *     - Suffix "HL" = R-410A extended pipe long
 *   R-32 (current gen):
 *     - Indoor: KNU, KNM (wall/cassette/ducted)
 *     - Outdoor: KUM, KUB
 *     - Suffix "HV" = R-32
 *     - LDN/LQN with "HV" suffix = R-32 concealed duct/cassette
 *
 * Returns "R-410A", "R-32", or null if not an LG model pattern.
 */
const LG_R410A_MODEL_RE = [
  /^LS[NUCE]\d/i,    // LSN, LSU, LSC = old wall mount / outdoor
  /^LM[NU]\d/i,      // LMN, LMU = old multi-zone
  /^LA[NU]\d/i,      // LAN, LAU = old Art Cool
  /^LC[NU]\d/i,      // LCN, LCU = old ceiling cassette
];

const LG_R32_MODEL_RE = [
  /^K[NU][UMAB]/i,   // KNU, KNM, KUM, KUB = new R-32
  /HV\d/i,           // "HV" suffix anywhere = R-32
];

const LG_R410A_SUFFIX_RE = /H[EXSYL]V?\d/i;  // HE, HX, HS, HY, HL suffixes

function detectRefrigerantFromLgModel(model) {
  if (!model) return null;
  // R-32 patterns take priority (e.g., LDN097HV4 is R-32 despite LDN prefix)
  for (const re of LG_R32_MODEL_RE) {
    if (re.test(model)) return "R-32";
  }
  // R-410A prefix patterns
  for (const re of LG_R410A_MODEL_RE) {
    if (re.test(model)) return "R-410A";
  }
  // R-410A suffix patterns (HE, HX, HS, HY, HL)
  if (LG_R410A_SUFFIX_RE.test(model)) return "R-410A";
  return null;
}

/**
 * @param {Object} product - shape from the scraper:
 *   { title, modelNumber, sku, description, specs }
 * @returns {string|null}
 */
export function detectRefrigerant(product) {
  if (!product) return null;
  const haystacks = [];
  if (product.title) haystacks.push(String(product.title));
  if (product.shortDescription) haystacks.push(String(product.shortDescription));
  if (product.description) haystacks.push(String(product.description));
  if (product.modelNumber) haystacks.push(String(product.modelNumber));
  if (product.sku) haystacks.push(String(product.sku));

  // Spec table — many vendors expose a "Refrigerant" or "Refrigerant Type"
  // field. Use it if present (highest signal), but still cross-check the
  // free-form text in case the spec field is generic ("HFC") or missing.
  if (product.specs && typeof product.specs === "object") {
    for (const [k, v] of Object.entries(product.specs)) {
      if (v == null) continue;
      if (/refriger/i.test(k)) {
        haystacks.unshift(String(v));
      }
    }
  }

  // Text-based detection (explicit "R-32", "R-410A" mentions)
  for (const text of haystacks) {
    for (const p of PATTERNS) {
      if (p.re.test(text)) return p.type;
    }
  }

  // Model-number-based detection for LG products.
  // Many LG products don't mention refrigerant in text but encode it
  // in the model number naming convention.
  const modelToCheck = product.modelNumber || product.sku;
  if (modelToCheck) {
    const fromModel = detectRefrigerantFromLgModel(modelToCheck);
    if (fromModel) return fromModel;
  }

  return null;
}

/**
 * Returns true if the product should be DROPPED from the ACiQ feed.
 * Drop rules (in order):
 *   1. Discontinued markers in title / specs
 *   2. R-410A refrigerant (legacy, phased out)
 */
export function shouldExcludeAciq(product) {
  if (isDiscontinued(product)) return true;
  if (detectRefrigerant(product) === "R-410A") return true;
  return false;
}

/**
 * Returns true if the product should be DROPPED from the LG feed.
 * Drop rules (in order):
 *   1. Discontinued markers
 *   2. Explicitly R-410A or R-22 (legacy refrigerants)
 *
 * Note: unknown refrigerant is KEPT — LG's current residential lineup is
 * almost entirely R-32, and many product pages don't expose refrigerant
 * type in a machine-readable way. Dropping unknowns would exclude most
 * of the catalog.
 */
export function shouldExcludeLg(product) {
  if (isDiscontinued(product)) return true;
  const r = detectRefrigerant(product);
  if (r === "R-410A" || r === "R-22") return true;
  return false;
}

const DISCONTINUED_RE = /\b(discontinu(?:ed|ing|ation|ous)?|obsolete|superseded|end[-\s]of[-\s]life|EOL|no longer (?:available|produced|made))\b/i;

/**
 * Heuristic discontinued check across title + specs.
 *
 * LG's product feed uses an explicit "Status: Active" / "Status: Inactive"
 * row in their spec table — so for products with that field present, the
 * absence of "active" is itself a discontinued signal (not just the
 * presence of the word "discontinued"). This catches LG-style listings
 * that the regex-only path would miss because they never use the word
 * "discontinued" anywhere in the page.
 */
function isDiscontinued(product) {
  if (!product) return false;
  if (product.title && DISCONTINUED_RE.test(product.title)) return true;
  if (product.shortDescription && DISCONTINUED_RE.test(product.shortDescription)) return true;
  if (product.description && DISCONTINUED_RE.test(product.description)) return true;
  if (product.specs && typeof product.specs === "object") {
    for (const [k, v] of Object.entries(product.specs)) {
      const s = `${k} ${v ?? ""}`;
      if (DISCONTINUED_RE.test(s)) return true;
      // LG's "Status" / "Product Status" row: anything not Active means out.
      if (/^(product[\s_-]*)?status$/i.test(k)) {
        const val = String(v ?? "").trim().toLowerCase();
        if (val && val !== "active" && val !== "current") return true;
      }
      // LG also exposes a boolean-ish "Active" key; false/no/0 means out.
      if (/^active$/i.test(k)) {
        const val = String(v ?? "").trim().toLowerCase();
        if (val === "false" || val === "no" || val === "0" || val === "n") return true;
      }
    }
  }
  return false;
}

/**
 * Stamp the detected refrigerant into the product's specs map under a
 * normalized key, so the storefront can filter on it without re-running
 * detection at query time.
 */
export function stampRefrigerant(product) {
  const r = detectRefrigerant(product);
  if (!r) return product;
  product.specs = product.specs ?? {};
  product.specs.refrigerant_normalized = r;
  return product;
}
