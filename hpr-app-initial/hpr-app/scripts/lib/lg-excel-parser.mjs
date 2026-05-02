/**
 * LG Sales Portal Excel price list parser.
 *
 * The LG Sales Portal (us.lgsalesportal.com) provides a downloadable
 * Excel file from the Price List page. This module parses that file
 * and returns structured product data with dealer pricing.
 *
 * Expected Excel columns (based on prior exports):
 *   - Model / Model Number / SKU
 *   - Description / Product Name
 *   - List Price / MSRP
 *   - Dealer Cost / Sales Price / Net Price
 *   - Category / Product Type
 *
 * The parser is flexible and auto-detects column names from the header row.
 */

import { readFile } from "fs/promises";

// Residential model prefixes we care about for HPR
// Based on the actual 756-product price list from lghvacpro.com (May 2026)
const RESIDENTIAL_PREFIXES = ["KUSA", "KUSX", "KNSA", "KNSL", "KUMX", "KNUA", "LKMM"];
const SPECIAL_PREFIXES = [
  "LS", "LU", "LA", "LC", "LH", "LV", "LQ", "KN", "KU",
  "AP",  // APHWC = Inverter Heat Pump Water Heaters
  "AN",  // ANEH = Electric Heat Kits, ARNU = Multi V indoor units, ARND = DOAS
  "AR",  // ARBL = Branch headers, ARNU/ARNH = indoor units & hydro kits
  "AB",  // ABDAMA = Conversion kits
];

/**
 * Parse the LG Excel price list file using the xlsx library.
 * @param {string} filePath - Path to the downloaded .xlsx file
 * @param {object} [opts]
 * @param {function} [opts.log]
 * @returns {Promise<Array<{model: string, description: string, dealer_cost: number, list_price: number}>>}
 */
export async function parseLgExcel(filePath, { log = () => {} } = {}) {
  // Dynamic import of xlsx (installed as a dependency)
  const XLSX = await import("xlsx");

  const buffer = await readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  log(`lg-excel: workbook has ${workbook.SheetNames.length} sheets: [${workbook.SheetNames.join(", ")}]`);

  // Try to find the price list sheet
  const sheetName = findPriceSheet(workbook.SheetNames);
  log(`lg-excel: using sheet "${sheetName}"`);

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rows.length === 0) {
    log("lg-excel: sheet is empty");
    return [];
  }

  // Auto-detect column mapping from header names
  const headers = Object.keys(rows[0]);
  log(`lg-excel: detected columns: [${headers.join(", ")}]`);

  const colMap = detectColumns(headers);
  log(`lg-excel: column mapping: model=${colMap.model}, desc=${colMap.description}, dealer=${colMap.dealerCost}, list=${colMap.listPrice}`);

  if (!colMap.model) {
    throw new Error(`Could not detect model/SKU column. Headers: ${headers.join(", ")}`);
  }

  // Parse rows
  const products = [];
  let skipped = 0;

  for (const row of rows) {
    const rawModel = String(row[colMap.model] ?? "").trim();
    if (!rawModel) continue;

    // Clean Korean character prefix
    const model = rawModel.startsWith("ㄴ ") ? rawModel.substring(2) : rawModel;

    // Filter to residential products
    if (!isRelevant(model)) {
      skipped++;
      continue;
    }

    const description = String(row[colMap.description] ?? "").trim();
    const dealerCost = parseNumber(row[colMap.dealerCost]);
    const listPrice = parseNumber(row[colMap.listPrice]);

    if (dealerCost == null || dealerCost <= 0) {
      skipped++;
      continue;
    }

    products.push({
      model,
      description,
      dealer_cost: dealerCost,
      list_price: listPrice ?? dealerCost, // Fallback if no list price
    });
  }

  log(`lg-excel: parsed ${products.length} relevant products (skipped ${skipped})`);
  return products;
}

/**
 * Find the most likely price list sheet name.
 */
function findPriceSheet(sheetNames) {
  // Priority: exact matches first
  const priceKeywords = ["price", "pricelist", "price list", "products", "catalog", "dealer"];
  for (const keyword of priceKeywords) {
    const match = sheetNames.find((s) => s.toLowerCase().includes(keyword));
    if (match) return match;
  }
  // Default to first sheet
  return sheetNames[0];
}

/**
 * Auto-detect column names from headers.
 * 
 * Actual lghvacpro.com Excel headers (May 2026):
 *   Product Name | Model Type | Description | Submittal Link | List Price | Applied DC(%) | Sales Price
 *
 * "Product Name" is the model number (e.g. ABDAMA0, ANEH033B1).
 * "Sales Price" is the dealer cost (List Price × 0.70).
 */
function detectColumns(headers) {
  const lower = headers.map((h) => h.toLowerCase());

  const findCol = (patterns, exclude = []) => {
    for (const pattern of patterns) {
      const idx = lower.findIndex((h, i) =>
        h.includes(pattern) && !exclude.includes(i)
      );
      if (idx >= 0) return headers[idx];
    }
    return null;
  };

  // Model is in "Product Name" column (first column)
  const model = findCol(["product name", "model", "sku", "part number", "part #", "item", "catalog"]);
  const modelIdx = lower.indexOf(model?.toLowerCase());

  // Description is a separate column — exclude the model column from matching
  const description = findCol(["description", "name", "title"], modelIdx >= 0 ? [modelIdx] : []);

  return {
    model,
    description,
    dealerCost: findCol(["sales price", "dealer cost", "dealer price", "net price", "your price"]),
    listPrice: findCol(["list price", "msrp", "retail", "suggested retail"]),
  };
}

function isRelevant(model) {
  const upper = model.toUpperCase();
  if (RESIDENTIAL_PREFIXES.some((px) => upper.startsWith(px))) return true;
  if (SPECIAL_PREFIXES.some((px) => upper.startsWith(px))) return true;
  // If we can't determine relevance by prefix, include it anyway —
  // the price list from lghvacpro.com is already filtered to our account's products
  return true;
}

function parseNumber(val) {
  if (val == null) return null;
  if (typeof val === "number") return val;
  const s = String(val).replace(/[$,\s]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * Determine category slug based on model/description.
 */
export function mapCategory(model, description) {
  const desc = description.toLowerCase();
  const m = model.toUpperCase();

  if (m.startsWith("KUS") || m.startsWith("KUM") || m.startsWith("LU") || m.startsWith("LS")) {
    return "heat-pumps"; // Outdoor units
  }
  if (desc.includes("air handler") || desc.includes("ahu") || desc.includes("a-coil") || desc.includes("vahu")) {
    return "air-handlers";
  }
  if (desc.includes("wall mount") || desc.includes("art cool")) {
    return "mini-splits";
  }
  if (desc.includes("cassette") || desc.includes("ducted") || desc.includes("floor standing") || desc.includes("console")) {
    return "mini-splits";
  }
  return "mini-splits";
}

/**
 * Determine product type from description.
 */
export function getProductType(description) {
  const desc = description.toLowerCase();
  if (desc.includes("kit") || desc.includes("grille") || desc.includes("controller") || desc.includes("thermostat")) {
    return "accessory";
  }
  return "equipment";
}

/**
 * Parse specs from description text.
 */
export function parseSpecs(description) {
  const specs = {};

  // BTU
  const btuMatch = description.match(/(\d+)\s*k?\s*(?:btu|mbh)/i);
  if (btuMatch) {
    const val = parseInt(btuMatch[1]);
    specs.btu = val > 1000 ? val : val * 1000;
  }

  // Tonnage from BTU
  if (specs.btu) specs.tonnage = Math.round((specs.btu / 12000) * 10) / 10;

  // Refrigerant
  if (/r-?32\b/i.test(description)) specs.refrigerant = "R-32";
  else if (/r-?454b/i.test(description)) specs.refrigerant = "R-454B";
  else if (/r-?410a/i.test(description)) specs.refrigerant = "R-410A";

  // Zone type
  if (/single\s*zone/i.test(description)) specs.zone_type = "single";
  else if (/multi[\s-]*zone/i.test(description)) specs.zone_type = "multi";

  // Voltage
  const voltMatch = description.match(/(\d+)\s*[/-]?\s*(\d+)?\s*V\b/i);
  if (voltMatch) specs.voltage = voltMatch[0];

  // LGRED
  if (/lgred/i.test(description)) specs.lgred = true;

  return specs;
}
