import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveKeywordFilters } from "@/lib/search-keywords";

/**
 * GET /api/search?q=<term>
 *
 * Returns up to 8 product/system suggestions for the universal search
 * autocomplete. Uses a combined search strategy:
 *
 * 1. **Text matching** — each individual word is matched against text
 *    columns (title, SKU, brand, description, model_number).
 *
 * 2. **Keyword-to-filter mapping** — recognizes common phrases like
 *    "water heater", "mini split", "wall mount" and translates them
 *    into structured JSONB spec filters (system_type, equipment_type, etc.)
 *
 * When keyword mappings are found, all text parts and spec parts are
 * combined into a single OR query so that a product matching ANY of
 * the criteria is returned.
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
  // 1. Product search — single combined OR query
  // ------------------------------------------------------------------
  const productColumns = ["title", "sku", "brand", "short_description", "model_number"];

  let productQuery = supabase
    .from("products")
    .select("id, sku, brand, title, thumbnail_url, product_type")
    .eq("is_active", true);

  if (keywordFilters.length > 0) {
    // Build a single OR: any text column matches any term, OR spec filter matches
    const textParts: string[] = [];
    for (const term of terms) {
      const p = `%${term}%`;
      for (const col of productColumns) {
        textParts.push(`${col}.ilike.${p}`);
      }
    }
    const specParts: string[] = [];
    for (const kf of keywordFilters) {
      for (const val of kf.specValues) {
        specParts.push(`specs->>${kf.specKey}.eq.${val}`);
      }
    }
    productQuery = productQuery.or([...textParts, ...specParts].join(","));
  } else {
    // No keyword mappings — standard multi-word text search
    // Each word must match at least one column
    for (const term of terms) {
      const p = `%${term}%`;
      productQuery = productQuery.or(
        productColumns.map((col) => `${col}.ilike.${p}`).join(",")
      );
    }
  }

  const { data: products } = await productQuery
    .order("created_at", { ascending: false })
    .limit(MAX_RESULTS * 2); // Fetch extra since some may be unpriced

  // ------------------------------------------------------------------
  // 2. System search — single combined OR query
  // ------------------------------------------------------------------
  const systemColumns = ["title", "system_sku", "description"];

  let systemQuery = supabase
    .from("system_packages")
    .select("id, system_sku, title, thumbnail_url, ahri_number")
    .eq("is_active", true);

  if (keywordFilters.length > 0) {
    const textParts: string[] = [];
    for (const term of terms) {
      const p = `%${term}%`;
      for (const col of systemColumns) {
        textParts.push(`${col}.ilike.${p}`);
      }
    }
    const specParts: string[] = [];
    for (const kf of keywordFilters) {
      for (const val of kf.specValues) {
        specParts.push(`specs->>${kf.specKey}.eq.${val}`);
      }
    }
    systemQuery = systemQuery.or([...textParts, ...specParts].join(","));
  } else {
    for (const term of terms) {
      const p = `%${term}%`;
      systemQuery = systemQuery.or(
        systemColumns.map((col) => `${col}.ilike.${p}`).join(",")
      );
    }
  }

  const { data: systems } = await systemQuery
    .order("created_at", { ascending: false })
    .limit(MAX_RESULTS);

  // ------------------------------------------------------------------
  // 3. Batch-fetch Retail pricing
  // ------------------------------------------------------------------
  const productIds = (products ?? []).map((p) => p.id);
  const systemIds = (systems ?? []).map((s) => s.id);

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
  // 4. Build unified suggestion list (only priced items)
  // ------------------------------------------------------------------
  const suggestions: SearchSuggestion[] = [];

  for (const p of products ?? []) {
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
      price: pr.price ?? null,
      msrp: pr.msrp ?? null,
      productType: p.product_type,
    });
  }

  for (const s of systems ?? []) {
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
      price: pr.price ?? null,
      msrp: pr.msrp ?? null,
    });
  }

  const limited = suggestions.slice(0, MAX_RESULTS);

  return NextResponse.json({
    suggestions: limited,
    total: suggestions.length,
    query: q,
  });
}
