/**
 * Backfill HVAC Direct data for ACiQ products that are missing:
 *   - MSRP (HVAC Direct list price for strikethrough)
 *   - Documents (PDFs: manuals, spec sheets, warranty)
 *   - Specs (detailed product specifications)
 *   - Description
 *
 * This script finds ACiQ products that were imported from the portal only
 * (missing public HVAC Direct enrichment) and scrapes their HVAC Direct
 * pages to fill in the gaps.
 *
 * Usage:
 *   node scripts/backfill-hvacdirect-data.mjs                  # full run
 *   node scripts/backfill-hvacdirect-data.mjs --dry-run        # preview only
 *   node scripts/backfill-hvacdirect-data.mjs --limit=10       # limit products
 *   node scripts/backfill-hvacdirect-data.mjs --sku=G97CMN0801714  # single product
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import {
  HVACDIRECT_BASE,
  fetchProductDetail,
} from "./lib/hvacdirect.mjs";
import { normalizeSpecs } from "./lib/spec-normalizer.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tcnkumgqfezttiqzxsan.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbmt1bWdxZmV6dHRpcXp4c2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM0MDQzMiwiZXhwIjoyMDkyOTE2NDMyfQ.eYbKyg1EKP83afWg0gy3JPKzS4FgL4nhwjSpr_zKm78";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : null;
const skuArg = args.find((a) => a.startsWith("--sku="));
const targetSku = skuArg ? skuArg.split("=")[1] : null;

function log(msg) {
  console.log(`[backfill-hvac] ${msg}`);
}

/**
 * Search HVAC Direct for a product by SKU/model number.
 * Returns the product page URL if found.
 */
async function findHvacDirectUrl(sku) {
  const searchUrl = `${HVACDIRECT_BASE}/catalogsearch/result/?q=${encodeURIComponent(sku)}`;
  try {
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HPR-Sync/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    
    // Check if we landed directly on a product page (exact match redirect)
    if (res.url && res.url.includes(".html") && !res.url.includes("catalogsearch")) {
      return res.url;
    }
    
    // Parse search results to find the product link
    const { default: cheerio } = await import("cheerio");
    const $ = cheerio.load(html);
    
    // Look for a product link that contains the SKU in the URL or title
    const skuLower = sku.toLowerCase();
    let bestUrl = null;
    
    $("a.product-item-link, .product-item a[href*='.html']").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim().toLowerCase();
      if (href && (href.toLowerCase().includes(skuLower) || text.includes(skuLower))) {
        bestUrl = href;
        return false; // break
      }
    });
    
    // Fallback: first product result
    if (!bestUrl) {
      bestUrl = $("a.product-item-link").first().attr("href") || null;
    }
    
    return bestUrl;
  } catch (err) {
    log(`  search failed for ${sku}: ${err.message}`);
    return null;
  }
}

/**
 * Rehost a document to Supabase Storage.
 */
async function rehostDocument(productId, sku, doc) {
  try {
    const res = await fetch(doc.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HPR-Sync/1.0)" },
    });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const ext = (doc.url.split(".").pop() || "pdf").toLowerCase().split("?")[0];
    const slug = doc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
    const fileKey = `documents/${sku}/${slug}.${ext}`;
    
    const { error: upErr } = await supabase.storage
      .from("product-media")
      .upload(fileKey, buf, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      log(`  upload error for ${doc.name}: ${upErr.message}`);
      return null;
    }
    
    const { data: pub } = supabase.storage.from("product-media").getPublicUrl(fileKey);
    return {
      product_id: productId,
      url: pub.publicUrl,
      file_key: fileKey,
      source_url: doc.url,
      file_name: doc.name,
      doc_type: mapDocType(doc.type),
    };
  } catch (err) {
    log(`  rehost failed for ${doc.name}: ${err.message}`);
    return null;
  }
}

function mapDocType(raw) {
  const t = (raw ?? "").toLowerCase();
  if (t.includes("spec") || t.includes("data sheet")) return "spec_sheet";
  if (t.includes("install")) return "installation_manual";
  if (t.includes("service") || t.includes("manual")) return "installation_manual";
  if (t.includes("owner")) return "owners_manual";
  if (t.includes("warranty")) return "warranty";
  if (t.includes("brochure")) return "brochure";
  if (t.includes("ahri") || t.includes("certificate")) return "ahri_certificate";
  return "other";
}

async function main() {
  log(`Starting backfill (dryRun=${dryRun}, limit=${limit ?? "none"}, sku=${targetSku ?? "all"})`);
  
  // Find products that need backfill
  let query = supabase
    .table("products")
    .select("id, sku, title, brand, description, specs, category_id")
    .eq("brand", "ACiQ")
    .eq("is_active", true);
  
  if (targetSku) {
    query = query.eq("sku", targetSku);
  }
  
  const { data: products, error } = await query;
  if (error) {
    log(`ERROR fetching products: ${error.message}`);
    process.exit(1);
  }
  
  log(`Found ${products.length} ACiQ products to check`);
  
  // Get pricing data to find which ones are missing MSRP
  const productIds = products.map((p) => p.id);
  const pricingMap = new Map();
  
  for (let i = 0; i < productIds.length; i += 100) {
    const batch = productIds.slice(i, i + 100);
    const { data: pricingRows } = await supabase
      .from("product_pricing")
      .select("entity_id, msrp")
      .eq("entity_type", "product")
      .eq("tier_id", 1)
      .in("entity_id", batch);
    for (const row of pricingRows ?? []) {
      pricingMap.set(row.entity_id, row.msrp);
    }
  }
  
  // Get existing documents
  const docsMap = new Map();
  for (let i = 0; i < productIds.length; i += 100) {
    const batch = productIds.slice(i, i + 100);
    const { data: docRows } = await supabase
      .from("product_documents")
      .select("product_id")
      .in("product_id", batch);
    for (const row of docRows ?? []) {
      docsMap.set(row.product_id, (docsMap.get(row.product_id) || 0) + 1);
    }
  }
  
  // Filter to products that need enrichment
  const needsBackfill = products.filter((p) => {
    const hasMsrp = pricingMap.get(p.id) != null;
    const hasDocs = (docsMap.get(p.id) || 0) > 0;
    const hasDescription = !!p.description;
    // Need backfill if missing any of: MSRP, docs, or description
    return !hasMsrp || !hasDocs || !hasDescription;
  });
  
  log(`${needsBackfill.length} products need backfill (missing MSRP, docs, or description)`);
  
  const toProcess = limit ? needsBackfill.slice(0, limit) : needsBackfill;
  
  let updated = 0;
  let msrpFilled = 0;
  let docsFilled = 0;
  let descFilled = 0;
  let specsFilled = 0;
  let failed = 0;
  
  for (let i = 0; i < toProcess.length; i++) {
    const product = toProcess[i];
    log(`[${i + 1}/${toProcess.length}] ${product.sku}: ${product.title}`);
    
    // Find the HVAC Direct URL for this product
    const hvacUrl = await findHvacDirectUrl(product.sku);
    if (!hvacUrl) {
      log(`  not found on HVAC Direct`);
      failed++;
      continue;
    }
    log(`  found: ${hvacUrl}`);
    
    // Fetch the detail page
    let detail;
    try {
      detail = await fetchProductDetail(hvacUrl);
    } catch (err) {
      log(`  detail fetch failed: ${err.message}`);
      failed++;
      continue;
    }
    
    if (dryRun) {
      log(`  [DRY RUN] would update:`);
      if (detail.description && !product.description) log(`    - description (${detail.description.length} chars)`);
      if (Object.keys(detail.specs || {}).length > 0) log(`    - specs (${Object.keys(detail.specs).length} fields)`);
      if (detail.documents?.length > 0) log(`    - documents (${detail.documents.length} PDFs)`);
      // Check for MSRP from the page pricing
      log(`    - MSRP from page: would need listing data`);
      updated++;
      continue;
    }
    
    // Update description if missing
    if (detail.description && !product.description) {
      await supabase
        .from("products")
        .update({ description: detail.description })
        .eq("id", product.id);
      descFilled++;
    }
    
    // Update specs (merge with existing, preserving normalized fields)
    if (detail.specs && Object.keys(detail.specs).length > 0) {
      const rawSpecs = {
        ...detail.specs,
        SKU: product.sku,
      };
      // Get category slug for normalization
      let categorySlug = null;
      if (product.category_id) {
        const { data: cat } = await supabase
          .from("categories")
          .select("slug")
          .eq("id", product.category_id)
          .maybeSingle();
        categorySlug = cat?.slug ?? null;
      }
      const normalized = normalizeSpecs(rawSpecs, product.title, categorySlug);
      const mergedSpecs = { ...(product.specs ?? {}), ...normalized };
      
      await supabase
        .from("products")
        .update({ specs: mergedSpecs })
        .eq("id", product.id);
      specsFilled++;
    }
    
    // Add documents
    if (detail.documents && detail.documents.length > 0) {
      // Check existing docs to avoid duplicates
      const { data: existingDocs } = await supabase
        .from("product_documents")
        .select("source_url")
        .eq("product_id", product.id);
      const existingUrls = new Set((existingDocs ?? []).map((d) => d.source_url));
      
      let docsAdded = 0;
      for (const doc of detail.documents) {
        if (existingUrls.has(doc.url)) continue;
        const rehosted = await rehostDocument(product.id, product.sku, doc);
        if (rehosted) {
          await supabase.from("product_documents").insert(rehosted);
          docsAdded++;
        }
      }
      if (docsAdded > 0) {
        log(`  added ${docsAdded} documents`);
        docsFilled++;
      }
    }
    
    updated++;
    
    // Small delay to be polite to HVAC Direct
    await new Promise((r) => setTimeout(r, 500));
  }
  
  log(`\nBackfill complete:`);
  log(`  Processed: ${updated}`);
  log(`  Failed (not found): ${failed}`);
  log(`  Descriptions filled: ${descFilled}`);
  log(`  Specs enriched: ${specsFilled}`);
  log(`  Documents added: ${docsFilled}`);
  log(`  MSRP: (requires listing page data — use sync-aciq.mjs for full MSRP backfill)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
