import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveKeywordFilters } from "@/lib/search-keywords";

/**
 * GET /api/search?q=<term>
 *
 * Returns up to 8 product/system suggestions for the universal search
 * autocomplete. Uses two search strategies:
 *
 * 1. **Text matching** — splits query into words, each word must match
 *    at least one text column (title, SKU, brand, description, model_number).
 *
 * 2. **Keyword-to-filter mapping** — recognizes common phrases like
 *    "water heater", "mini split", "wall mount" and translates them
 *    into structured JSONB spec filters (system_type, equipment_type, etc.)
 *
 * Results from both strategies are merged and deduplicated.
 */

export interface SearchSuggestion {
  id: number;
  type: "product" | "system";
  sku: string;
  brand: string;
  title: string;
  thumbnailUrl: string | null;
  href: string;
  price: string | null;
  msrp: string | null;
  productType?: string;
}

const MAX_RESULTS = 8;

function buildTermFilter(term: string, columns: string[]): string {
  const pattern = `%${term}%`;
  return columns.map((col) => `${col}.ilike.${pattern}`).join(",");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const supabase = await createClient();

  const terms = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (terms.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // Check for keyword-to-filter mappings (e.g. "water heater" → system_type=water-heater)
  const keywordFilters = resolveKeywordFilters(q);

  // ------------------------------------------------------------------
  // 1. Text-based product search
  // ------------------------------------------------------------------
  const productColumns = ["title", "sku", "brand", "short_description", "model_number"];

  let productTextQuery = supabase
    .from("products")
    .select("id, sku, brand, title, thumbnail_url, product_type")
    .eq("is_active", true);

  for (const term of terms) {
    productTextQuery = productTextQuery.or(buildTermFilter(term, productColumns));
  }

  const { data: productsText } = await productTextQuery
    .order("created_at", { ascending: false })
    .limit(MAX_RESULTS);

  // ------------------------------------------------------------------
  // 2. Keyword-filter-based product search (specs JSONB)
  // ------------------------------------------------------------------
  let productsKeyword: typeof productsText = [];
  if (keywordFilters.length > 0) {
    let kfQuery = supabase
      .from("products")
      .select("id, sku, brand, title, thumbnail_url, product_type")
      .eq("is_active", true);

    for (const kf of keywordFilters) {
      if (kf.specValues.length === 1) {
        kfQuery = kfQuery.eq(`specs->>${kf.specKey}`, kf.specValues[0]);
      } else {
        kfQuery = kfQuery.in(`specs->>${kf.specKey}`, kf.specValues);
      }
    }

    const { data } = await kfQuery
      .order("created_at", { ascending: false })
      .limit(MAX_RESULTS);
    productsKeyword = data ?? [];
  }

  // Merge and deduplicate products
  const seenProductIds = new Set<number>();
  const allProducts: NonNullable<typeof productsText> = [];
  for (const p of [...(productsKeyword ?? []), ...(productsText ?? [])]) {
    if (!seenProductIds.has(p.id)) {
      seenProductIds.add(p.id);
      allProducts.push(p);
    }
  }

  // ------------------------------------------------------------------
  // 3. Text-based system search
  // ------------------------------------------------------------------
  const systemColumns = ["title", "system_sku", "description"];

  let systemTextQuery = supabase
    .from("system_packages")
    .select("id, system_sku, title, thumbnail_url, ahri_number")
    .eq("is_active", true);

  for (const term of terms) {
    systemTextQuery = systemTextQuery.or(buildTermFilter(term, systemColumns));
  }

  const { data: systemsText } = await systemTextQuery
    .order("created_at", { ascending: false })
    .limit(4);

  // ------------------------------------------------------------------
  // 4. Keyword-filter-based system search
  // ------------------------------------------------------------------
  let systemsKeyword: typeof systemsText = [];
  if (keywordFilters.length > 0) {
    let skQuery = supabase
      .from("system_packages")
      .select("id, system_sku, title, thumbnail_url, ahri_number")
      .eq("is_active", true);

    for (const kf of keywordFilters) {
      if (kf.specValues.length === 1) {
        skQuery = skQuery.eq(`specs->>${kf.specKey}`, kf.specValues[0]);
      } else {
        skQuery = skQuery.in(`specs->>${kf.specKey}`, kf.specValues);
      }
    }

    const { data } = await skQuery
      .order("created_at", { ascending: false })
      .limit(4);
    systemsKeyword = data ?? [];
  }

  // Merge and deduplicate systems
  const seenSystemIds = new Set<number>();
  const allSystems: NonNullable<typeof systemsText> = [];
  for (const s of [...(systemsKeyword ?? []), ...(systemsText ?? [])]) {
    if (!seenSystemIds.has(s.id)) {
      seenSystemIds.add(s.id);
      allSystems.push(s);
    }
  }

  // ------------------------------------------------------------------
  // 5. Batch-fetch Retail pricing
  // ------------------------------------------------------------------
  const productIds = allProducts.map((p) => p.id);
  const systemIds = allSystems.map((s) => s.id);

  const pricingMap = new Map<string, { price: string; msrp: string | null }>();

  if (productIds.length > 0) {
    const { data: pricing } = await supabase
      .from("product_pricing")
      .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
      .eq("entity_type", "product")
      .in("entity_id", productIds);

    if (pricing) {
      for (const row of pricing as Array<{
        entity_id: number;
        total_price: string;
        msrp: string | null;
        pricing_tiers: { name: string } | { name: string }[];
      }>) {
        const tierName = Array.isArray(row.pricing_tiers)
          ? row.pricing_tiers[0]?.name
          : row.pricing_tiers?.name;
        if (tierName === "Retail") {
          pricingMap.set(`product-${row.entity_id}`, {
            price: row.total_price,
            msrp: row.msrp,
          });
        }
      }
    }
  }

  if (systemIds.length > 0) {
    const { data: pricing } = await supabase
      .from("product_pricing")
      .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
      .eq("entity_type", "system")
      .in("entity_id", systemIds);

    if (pricing) {
      for (const row of pricing as Array<{
        entity_id: number;
        total_price: string;
        msrp: string | null;
        pricing_tiers: { name: string } | { name: string }[];
      }>) {
        const tierName = Array.isArray(row.pricing_tiers)
          ? row.pricing_tiers[0]?.name
          : row.pricing_tiers?.name;
        if (tierName === "Retail") {
          pricingMap.set(`system-${row.entity_id}`, {
            price: row.total_price,
            msrp: row.msrp,
          });
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // 6. Build unified suggestion list
  // ------------------------------------------------------------------
  const suggestions: SearchSuggestion[] = [];

  for (const p of allProducts) {
    const pr = pricingMap.get(`product-${p.id}`);
    if (!pr) continue;
    suggestions.push({
      id: p.id,
      type: "product",
      sku: p.sku,
      brand: p.brand,
      title: p.title,
      thumbnailUrl: p.thumbnail_url,
      href: `/product/${encodeURIComponent(p.sku)}`,
      price: pr?.price ?? null,
      msrp: pr?.msrp ?? null,
      productType: p.product_type,
    });
  }

  for (const s of allSystems) {
    const pr = pricingMap.get(`system-${s.id}`);
    if (!pr) continue;
    suggestions.push({
      id: s.id,
      type: "system",
      sku: s.system_sku,
      brand: s.ahri_number ? `AHRI #${s.ahri_number}` : "System",
      title: s.title,
      thumbnailUrl: s.thumbnail_url,
      href: `/system/${encodeURIComponent(s.system_sku)}`,
      price: pr?.price ?? null,
      msrp: pr?.msrp ?? null,
    });
  }

  const limited = suggestions.slice(0, MAX_RESULTS);

  return NextResponse.json({
    suggestions: limited,
    total: allProducts.length + allSystems.length,
    query: q,
  });
}
