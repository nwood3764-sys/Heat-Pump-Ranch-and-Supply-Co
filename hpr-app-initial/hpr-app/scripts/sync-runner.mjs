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
 */

import { createClient } from "@supabase/supabase-js";

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
 * @property {Object} [pricing]      - { retail?, contractor?, wholesale?, msrp? }
 */

/**
 * @param {Object} opts
 * @param {'lg'|'aciq'|'ahri'} opts.portal
 * @param {() => Promise<{ products: ScrapedProduct[] }>} opts.scrape
 */
export async function runSync({ portal, scrape }) {
  const supabase = getSupabase();
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
    // SKU fallback: HVACDirect occasionally renumbers a listing (new sourceId
    // for the same SKU) or surfaces a different listing as canonical between
    // runs. Match by SKU when source_id misses so we UPDATE the existing
    // product row instead of trying (and failing) to INSERT a duplicate SKU.
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

    // 6. Finalize
    await supabase
      .from("sync_runs")
      .update({
        status: totals.products_failed > 0 ? "partial" : "completed",
        completed_at: new Date().toISOString(),
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
      metadata: { sync_run_id: runId, ...totals },
    });

    console.log(`[${portal}] done`, totals);
    return totals;
  } catch (err) {
    await supabase
      .from("sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: String(err?.message ?? err),
        ...totals,
      })
      .eq("id", runId);
    await supabase.from("notifications").insert({
      type: "sync_failed",
      title: `${portal.toUpperCase()} sync FAILED`,
      message: String(err?.message ?? err),
    });
    throw err;
  }
}

async function upsertProduct(supabase, portal, sp, existingBySourceId, existingBySku, runId) {
  // Match by source_id first; if HVACDirect renumbered, fall back to SKU.
  // When matched via SKU, we'll UPDATE the existing row and rewrite source_id
  // to the new value so future runs match by source_id again. Keep both
  // maps in sync to prevent the discontinued reconciler from killing the
  // row this same run.
  let existing = existingBySourceId.get(sp.sourceId);
  let matchedVia = "source_id";
  if (!existing) {
    existing = existingBySku.get(sp.sku);
    if (existing) {
      matchedVia = "sku";
      // Re-key into existingBySourceId under the NEW sourceId so reconciliation
      // doesn't mark this product discontinued (it would still be keyed under
      // the OLD sourceId, which is no longer in seenSourceIds).
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

  // Single Postgres upsert keyed on the SKU unique index. The products.sku
  // column is citext, so 'ABC123' and 'abc123' collide on the unique index;
  // a SELECT-then-INSERT path races on case-variant SKUs and throws. ON
  // CONFLICT (sku) DO UPDATE collapses both into one row in a single
  // statement and lets the second variant overwrite the first cleanly.
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
  if (sp.pricing) {
    priceChanges = await upsertPricing(supabase, productId, sp.pricing, portal, runId);
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

  return { action, priceChanges, imagesRehosted, documentsAdded };
}

async function upsertPricing(supabase, productId, pricing, portal, runId) {
  const { data: tiers } = await supabase.from("pricing_tiers").select("id, name");
  if (!tiers) return 0;
  const tierByName = new Map(tiers.map((t) => [t.name.toLowerCase(), t.id]));

  const map = {
    retail: pricing.retail,
    contractor: pricing.contractor,
    wholesale: pricing.wholesale,
  };
  let changes = 0;

  for (const [name, price] of Object.entries(map)) {
    if (price == null) continue;
    const tierId = tierByName.get(name);
    if (!tierId) continue;

    // Read current price for diff
    const { data: existing } = await supabase
      .from("product_pricing")
      .select("total_price")
      .eq("entity_type", "product")
      .eq("entity_id", productId)
      .eq("tier_id", tierId)
      .maybeSingle();

    const newPrice = Number(price);
    const oldPrice = existing ? Number(existing.total_price) : null;

    await supabase
      .from("product_pricing")
      .upsert(
        {
          entity_type: "product",
          entity_id: productId,
          tier_id: tierId,
          cost_equipment: newPrice,
          total_price: newPrice,
          msrp: pricing.msrp ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,entity_id,tier_id" },
      );

    if (oldPrice !== null && Math.abs(oldPrice - newPrice) > 0.005) {
      const deltaPct = ((newPrice - oldPrice) / oldPrice) * 100;
      await supabase.from("price_history").insert({
        entity_type: "product",
        entity_id: productId,
        tier_id: tierId,
        old_price: oldPrice,
        new_price: newPrice,
        delta_pct: Number(deltaPct.toFixed(2)),
        source: portal,
        sync_run_id: runId,
      });
      changes++;
    }
  }
  return changes;
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

function mapDocType(t) {
  const v = (t ?? "").toLowerCase();
  if (v.includes("install")) return "installation_manual";
  if (v.includes("warranty")) return "warranty";
  if (v.includes("brochure")) return "brochure";
  if (v.includes("spec")) return "spec_sheet";
  return "other";
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
