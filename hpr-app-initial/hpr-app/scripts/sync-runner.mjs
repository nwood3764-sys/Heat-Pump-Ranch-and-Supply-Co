/**
 * Shared sync runner.
 *
 * Each portal-specific scraper imports `runSync()` and provides:
 *   - portal: 'lg' | 'aciq' | 'ahri'
 *   - scrape(): async function returning { products: ScrapedProduct[] }
 *
 * runSync() handles:
 *   - creating a sync_runs row in 'running' status
 *   - reconciliation (diff vs current DB state)
 *   - upserting products + images + pricing
 *   - rehosting images to Supabase Storage
 *   - logging price changes to price_history
 *   - marking discontinued SKUs (seen previously, not seen this run)
 *   - writing per-item rows to sync_run_items
 *   - finalizing the sync_runs row with totals
 *   - posting a notification on completion or failure
 *
 * PRICING MODEL
 *   - cost_equipment = dealer cost (from ACIQ portal or LG sales portal)
 *   - total_price    = cost_equipment × RETAIL_MARKUP (our selling price)
 *   - msrp           = HVAC Direct internet list price (competitor price,
 *                       shown as strikethrough on the storefront)
 *
 *   The scraper passes:
 *     pricing.dealer   — dealer/wholesale cost from the portal
 *     pricing.msrp     — HVAC Direct internet list price (competitor)
 *     pricing.retail   — fallback: if no dealer cost, use retail as-is
 */

import { createClient } from "@supabase/supabase-js";

/** 30% markup on dealer cost = our retail selling price */
export const RETAIL_MARKUP = 1.3;

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Compute our retail price from dealer cost.
 * @param {number} dealerCost
 * @returns {number} rounded to cents
 */
export function computeRetailPrice(dealerCost) {
  return Math.round(dealerCost * RETAIL_MARKUP * 100) / 100;
}

/**
 * @typedef {Object} ScrapedProduct
 * @property {string} sourceId       - portal's stable id (used for matching across runs)
 * @property {string} sku
 * @property {string} brand
 * @property {string} title
 * @property {string} [modelNumber]
 * @property {string} [shortDescription]
 * @property {string} [description]
 * @property {string} [categorySlug]
 * @property {'equipment'|'accessory'|'part'} [productType]
 * @property {Object} [specs]
 * @property {number} [weight]
 * @property {string} [sourceUrl]
 * @property {string[]} [imageUrls]
 * @property {Array<{name: string, url: string, type: string}>} [documents]
 * @property {Object} [pricing]      - { dealer?, retail?, msrp? }
 *   dealer = dealer/wholesale cost from portal (preferred cost basis)
 *   retail = HVAC Direct retail price (used as cost basis only if dealer is missing)
 *   msrp   = HVAC Direct internet list price (competitor price for strikethrough)
 */

/**
 * Capture every console.log / console.error call into an in-memory
 * buffer. We persist the buffer into sync_runs.details at the end of
 * the run so a remote operator can read the full scraper log via the
 * database without needing GitHub Actions log access.
 *
 * The original console methods still fire so the GitHub Actions log
 * also receives everything — this is purely additive.
 */
function captureConsole() {
  const lines = [];
  const orig = { error: console.error, log: console.log };
  const wrap = (level, fn) => (...args) => {
    try {
      const text = args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2)))
        .join(" ");
      lines.push({ t: new Date().toISOString(), level, text });
      // Hard cap to keep the row small — keep the most recent 1500
      // entries which covers the diagnostic context we actually need.
      if (lines.length > 1500) lines.splice(0, lines.length - 1500);
    } catch {
      // Never let logging itself break the run.
    }
    fn.apply(console, args);
  };
  console.error = wrap("error", orig.error);
  console.log = wrap("log", orig.log);
  return {
    lines,
    restore: () => {
      console.error = orig.error;
      console.log = orig.log;
    },
  };
}

/**
 * @param {Object} opts
 * @param {'lg'|'aciq'|'ahri'} opts.portal
 * @param {() => Promise<{ products: ScrapedProduct[] }>} opts.scrape
 */
export async function runSync({ portal, scrape }) {
  const supabase = getSupabase();
  const cap = captureConsole();
  console.log(`[${portal}] starting sync`);

  // 1. Open a sync_runs row
  const { data: runRow, error: runErr } = await supabase
    .from("sync_runs")
    .insert({ portal, status: "running", triggered_by: "cron" })
    .select("id")
    .single();
  if (runErr) throw runErr;
  const runId = runRow.id;

  let totals = {
    products_seen: 0,
    products_added: 0,
    products_updated: 0,
    products_unchanged: 0,
    products_discontinued: 0,
    products_failed: 0,
    price_changes: 0,
    images_rehosted: 0,
    documents_added: 0,
  };

  // Collect per-product pricing details for the nightly report
  const pricingReport = [];

  try {
    // 2. Scrape
    const { products: scraped } = await scrape();
    totals.products_seen = scraped.length;
    console.log(`[${portal}] scraped ${scraped.length} products`);

    // 3. Load current state for reconciliation
    const { data: existing } = await supabase
      .from("products")
      .select("id, sku, source_id, title, thumbnail_url, discontinued_at")
      .eq("source_portal", portal);
    const existingBySourceId = new Map(
      (existing ?? []).filter((p) => p.source_id).map((p) => [p.source_id, p]),
    );
    const existingBySku = new Map(
      (existing ?? []).filter((p) => p.sku).map((p) => [p.sku, p]),
    );
    const seenSourceIds = new Set();

    // 4. Process each scraped product
    for (const sp of scraped) {
      seenSourceIds.add(sp.sourceId);
      try {
        const result = await upsertProduct(supabase, portal, sp, existingBySourceId, existingBySku, runId);
        if (result.action === "created") totals.products_added++;
        else if (result.action === "updated") totals.products_updated++;
        else if (result.action === "unchanged") totals.products_unchanged++;
        if (result.priceChanges) totals.price_changes += result.priceChanges;
        if (result.imagesRehosted) totals.images_rehosted += result.imagesRehosted;
        if (result.documentsAdded) totals.documents_added += result.documentsAdded;

        // Collect pricing data for the report
        if (result.pricingDetail) {
          pricingReport.push(result.pricingDetail);
        }
      } catch (err) {
        totals.products_failed++;
        await supabase.from("sync_run_items").insert({
          sync_run_id: runId,
          source_id: sp.sourceId,
          sku: sp.sku,
          action: "failed",
          error_message: String(err?.message ?? err),
        });
        console.error(`[${portal}] failed ${sp.sku}:`, err);
      }
    }

    // 5. Reconcile: anything in DB but not seen this run = discontinued
    for (const [sourceId, prev] of existingBySourceId) {
      if (!seenSourceIds.has(sourceId) && !prev.discontinued_at) {
        await supabase
          .from("products")
          .update({ discontinued_at: new Date().toISOString(), is_active: false })
          .eq("id", prev.id);
        await supabase.from("sync_run_items").insert({
          sync_run_id: runId,
          source_id: sourceId,
          product_id: prev.id,
          sku: prev.sku,
          action: "discontinued",
        });
        totals.products_discontinued++;
      }
    }

    // 6. Build pricing report summary
    const reportLines = buildPricingReport(pricingReport);

    // 7. Finalize
    await supabase
      .from("sync_runs")
      .update({
        status: totals.products_failed > 0 ? "partial" : "completed",
        completed_at: new Date().toISOString(),
        details: { log: cap.lines },
        ...totals,
      })
      .eq("id", runId);

    await supabase.from("notifications").insert({
      type: "sync_complete",
      title: `${portal.toUpperCase()} sync ${totals.products_failed > 0 ? "partial" : "complete"}`,
      message:
        `Seen ${totals.products_seen}, added ${totals.products_added}, ` +
        `updated ${totals.products_updated}, discontinued ${totals.products_discontinued}, ` +
        `price changes ${totals.price_changes}, failed ${totals.products_failed}.`,
      metadata: {
        sync_run_id: runId,
        ...totals,
        pricing_report: pricingReport,
      },
    });

    // Log the pricing report to console for the nightly run output
    if (reportLines.length > 0) {
      console.log(`\n[${portal}] ===== PRICING REPORT =====`);
      console.log(reportLines.join("\n"));
      console.log(`[${portal}] ===== END PRICING REPORT =====\n`);
    }

    console.log(`[${portal}] done`, totals);
    cap.restore();
    return totals;
  } catch (err) {
    // Persist whatever we have so the failure is debuggable from
    // sync_runs.details without needing GitHub Actions log access.
    await supabase
      .from("sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: String(err?.message ?? err),
        details: { log: cap.lines },
        ...totals,
      })
      .eq("id", runId);
    await supabase.from("notifications").insert({
      type: "sync_failed",
      title: `${portal.toUpperCase()} sync FAILED`,
      message: String(err?.message ?? err),
    });
    cap.restore();
    throw err;
  }
}

/**
 * Build a human-readable pricing report from collected pricing details.
 */
function buildPricingReport(pricingReport) {
  if (pricingReport.length === 0) return [];

  const lines = [];
  const header = `${"SKU".padEnd(30)} ${"Dealer Cost".padStart(12)} ${"Our Price".padStart(12)} ${"HVAC Direct".padStart(12)} ${"Savings".padStart(10)} ${"Margin".padStart(8)}`;
  lines.push(header);
  lines.push("-".repeat(header.length));

  for (const item of pricingReport) {
    const dealerStr = item.dealerCost != null ? `$${item.dealerCost.toFixed(2)}` : "N/A";
    const ourStr = item.ourPrice != null ? `$${item.ourPrice.toFixed(2)}` : "N/A";
    const hvacStr = item.hvacDirectPrice != null ? `$${item.hvacDirectPrice.toFixed(2)}` : "N/A";
    const savingsStr = item.savings != null ? `$${item.savings.toFixed(2)}` : "N/A";
    const marginStr = item.marginPct != null ? `${item.marginPct.toFixed(1)}%` : "N/A";

    lines.push(
      `${item.sku.padEnd(30)} ${dealerStr.padStart(12)} ${ourStr.padStart(12)} ${hvacStr.padStart(12)} ${savingsStr.padStart(10)} ${marginStr.padStart(8)}`
    );
  }

  lines.push("");
  lines.push(`Total products: ${pricingReport.length}`);

  const withSavings = pricingReport.filter((p) => p.savings != null && p.savings > 0);
  if (withSavings.length > 0) {
    const avgSavings = withSavings.reduce((sum, p) => sum + p.savings, 0) / withSavings.length;
    lines.push(`Products with savings vs HVAC Direct: ${withSavings.length}`);
    lines.push(`Average savings: $${avgSavings.toFixed(2)}`);
  }

  return lines;
}

async function upsertProduct(supabase, portal, sp, existingBySourceId, existingBySku, runId) {
  let existing = existingBySourceId.get(sp.sourceId);
  let matchedVia = "source_id";
  if (!existing) {
    existing = existingBySku.get(sp.sku);
    if (existing) {
      matchedVia = "sku";
      if (existing.source_id && existingBySourceId.has(existing.source_id)) {
        existingBySourceId.delete(existing.source_id);
      }
      existingBySourceId.set(sp.sourceId, existing);
    }
  }
  const changes = {};
  let action = "unchanged";

  // Resolve category if provided
  let categoryId = null;
  if (sp.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", sp.categorySlug)
      .maybeSingle();
    categoryId = cat?.id ?? null;
  }

  const productData = {
    sku: sp.sku,
    brand: sp.brand,
    title: sp.title,
    model_number: sp.modelNumber ?? null,
    short_description: sp.shortDescription ?? null,
    description: sp.description ?? null,
    category_id: categoryId,
    product_type: sp.productType ?? "equipment",
    specs: sp.specs ?? null,
    weight: sp.weight ?? null,
    source_portal: portal,
    source_id: sp.sourceId,
    source_url: sp.sourceUrl ?? null,
    last_synced_at: new Date().toISOString(),
    is_active: true,
    discontinued_at: null,
  };

  if (existing) {
    if (existing.title !== sp.title) changes.title = { old: existing.title, new: sp.title };
    if (matchedVia === "sku" && existing.source_id !== sp.sourceId) {
      changes.source_id = { old: existing.source_id, new: sp.sourceId, matched_via: "sku" };
    }
  }
  const { data: upserted, error: upsertErr } = await supabase
    .from("products")
    .upsert(productData, { onConflict: "sku" })
    .select("id")
    .single();
  if (upsertErr) throw upsertErr;
  const productId = upserted.id;
  if (!existing) {
    action = "created";
  } else if (Object.keys(changes).length > 0) {
    action = "updated";
  }

  // Pricing — write to product_pricing per tier
  let priceChanges = 0;
  let pricingDetail = null;
  if (sp.pricing) {
    const result = await upsertPricing(supabase, productId, sp.sku, sp.pricing, portal, runId);
    priceChanges = result.changes;
    pricingDetail = result.pricingDetail;
  }

  // Images — rehost to Supabase Storage
  let imagesRehosted = 0;
  if (sp.imageUrls && sp.imageUrls.length > 0) {
    imagesRehosted = await rehostImages(supabase, productId, sp.sku, sp.imageUrls);
  }

  // Documents
  let documentsAdded = 0;
  if (sp.documents && sp.documents.length > 0) {
    documentsAdded = await rehostDocuments(supabase, productId, sp.sku, sp.documents);
  }

  // Audit
  await supabase.from("sync_run_items").insert({
    sync_run_id: runId,
    source_id: sp.sourceId,
    product_id: productId,
    sku: sp.sku,
    action,
    changes: Object.keys(changes).length > 0 ? changes : null,
  });

  return { action, priceChanges, imagesRehosted, documentsAdded, pricingDetail };
}

/**
 * Upsert pricing with the new model:
 *   - cost_equipment = dealer cost (from portal)
 *   - total_price    = dealer cost × 1.30 (our selling price)
 *   - msrp           = HVAC Direct internet list price (competitor strikethrough)
 *
 * If no dealer cost is available, falls back to retail price as cost basis.
 */
async function upsertPricing(supabase, productId, sku, pricing, portal, runId) {
  const { data: tiers } = await supabase.from("pricing_tiers").select("id, name");
  if (!tiers) return { changes: 0, pricingDetail: null };
  const tierByName = new Map(tiers.map((t) => [t.name.toLowerCase(), t.id]));

  const retailTierId = tierByName.get("retail");
  if (!retailTierId) return { changes: 0, pricingDetail: null };

  // Determine dealer cost: prefer explicit dealer price, fall back to retail
  const dealerCost = pricing.dealer ?? pricing.contractor ?? pricing.wholesale ?? pricing.retail ?? null;
  // HVAC Direct internet list price (for strikethrough display)
  const hvacDirectPrice = pricing.msrp ?? null;

  if (dealerCost == null) {
    return { changes: 0, pricingDetail: null };
  }

  const dealerCostNum = Number(dealerCost);
  const ourPrice = computeRetailPrice(dealerCostNum);
  const hvacDirectNum = hvacDirectPrice != null ? Number(hvacDirectPrice) : null;

  // Read current price for diff
  const { data: existingRow } = await supabase
    .from("product_pricing")
    .select("total_price")
    .eq("entity_type", "product")
    .eq("entity_id", productId)
    .eq("tier_id", retailTierId)
    .maybeSingle();

  const oldPrice = existingRow ? Number(existingRow.total_price) : null;

  await supabase
    .from("product_pricing")
    .upsert(
      {
        entity_type: "product",
        entity_id: productId,
        tier_id: retailTierId,
        cost_equipment: dealerCostNum,
        total_price: ourPrice,
        msrp: hvacDirectNum,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,entity_id,tier_id" },
    );

  let changes = 0;
  if (oldPrice !== null && Math.abs(oldPrice - ourPrice) > 0.005) {
    const deltaPct = ((ourPrice - oldPrice) / oldPrice) * 100;
    await supabase.from("price_history").insert({
      entity_type: "product",
      entity_id: productId,
      tier_id: retailTierId,
      old_price: oldPrice,
      new_price: ourPrice,
      delta_pct: Number(deltaPct.toFixed(2)),
      source: portal,
      sync_run_id: runId,
    });
    changes++;
  }

  // Build pricing detail for the nightly report
  const savings = hvacDirectNum != null ? hvacDirectNum - ourPrice : null;
  const marginPct = hvacDirectNum != null && hvacDirectNum > 0
    ? ((hvacDirectNum - ourPrice) / hvacDirectNum) * 100
    : null;

  const pricingDetail = {
    sku,
    dealerCost: dealerCostNum,
    ourPrice,
    hvacDirectPrice: hvacDirectNum,
    savings: savings != null && savings > 0 ? savings : null,
    marginPct: marginPct != null && marginPct > 0 ? marginPct : null,
  };

  return { changes, pricingDetail };
}

async function rehostImages(supabase, productId, sku, urls) {
  // Get already-rehosted images for this product
  const { data: existing } = await supabase
    .from("product_images")
    .select("source_url")
    .eq("product_id", productId);
  const have = new Set((existing ?? []).map((r) => r.source_url));

  let added = 0;
  for (let i = 0; i < urls.length; i++) {
    const sourceUrl = urls[i];
    if (have.has(sourceUrl)) continue;

    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) {
        console.warn(`[image] ${sku}: ${res.status} ${sourceUrl}`);
        continue;
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      const ext = (sourceUrl.split(".").pop() || "jpg").toLowerCase().split("?")[0];
      const fileKey = `products/${sku}/${i}.${ext}`;
      const contentType =
        ext === "png" ? "image/png" :
        ext === "webp" ? "image/webp" :
        "image/jpeg";

      const { error: upErr } = await supabase.storage
        .from("product-media")
        .upload(fileKey, buf, { contentType, upsert: true });
      if (upErr) {
        console.warn(`[image] ${sku}: upload failed`, upErr.message);
        continue;
      }
      const { data: pub } = supabase.storage.from("product-media").getPublicUrl(fileKey);

      const { error: rowErr } = await supabase.from("product_images").insert({
        product_id: productId,
        url: pub.publicUrl,
        file_key: fileKey,
        source_url: sourceUrl,
        sort_order: i,
        is_primary: i === 0,
      });
      if (rowErr) {
        console.warn(`[image] ${sku}: row insert failed`, rowErr.message);
        continue;
      }

      // Set product thumbnail to the first image we successfully rehost
      if (i === 0) {
        await supabase.from("products").update({ thumbnail_url: pub.publicUrl }).eq("id", productId);
      }
      added++;
    } catch (err) {
      console.warn(`[image] ${sku}: ${err}`);
    }
  }
  return added;
}

async function rehostDocuments(supabase, productId, sku, docs) {
  const { data: existing } = await supabase
    .from("product_documents")
    .select("source_url")
    .eq("product_id", productId);
  const have = new Set((existing ?? []).map((r) => r.source_url));

  let added = 0;
  for (const d of docs) {
    if (have.has(d.url)) continue;
    try {
      const res = await fetch(d.url);
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      const ext = (d.url.split(".").pop() || "pdf").toLowerCase().split("?")[0];
      const fileKey = `documents/${sku}/${slugify(d.name)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-media")
        .upload(fileKey, buf, { contentType: "application/pdf", upsert: true });
      if (upErr) continue;
      const { data: pub } = supabase.storage.from("product-media").getPublicUrl(fileKey);
      await supabase.from("product_documents").insert({
        product_id: productId,
        url: pub.publicUrl,
        file_key: fileKey,
        source_url: d.url,
        file_name: d.name,
        doc_type: mapDocType(d.type),
      });
      added++;
    } catch (err) {
      console.warn(`[doc] ${sku}: ${err}`);
    }
  }
  return added;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function mapDocType(raw) {
  const t = (raw ?? "").toLowerCase();
  if (t.includes("spec") || t.includes("data sheet")) return "spec_sheet";
  if (t.includes("install")) return "installation_manual";
  if (t.includes("service") || t.includes("manual")) return "installation_manual";
  if (t.includes("warranty")) return "warranty";
  if (t.includes("brochure")) return "brochure";
  return "other";
}
