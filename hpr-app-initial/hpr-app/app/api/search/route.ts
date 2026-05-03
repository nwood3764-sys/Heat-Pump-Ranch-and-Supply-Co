import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/search?q=<term>
 *
 * Returns up to 8 product/system suggestions for the universal search
 * autocomplete. Results include thumbnail, title, SKU, brand, price,
 * and a link to the detail page.
 *
 * Multi-word queries are split into individual terms. Each term must
 * match at least one of: title, SKU, brand, short_description, or
 * model_number. This allows natural language searches like
 * "water heater", "LG mini split", "wall mount thermostat", etc.
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

/**
 * Build an OR filter string for a single search term across multiple columns.
 * Each term is wrapped in %...% for ILIKE substring matching.
 */
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

  // Split query into individual words, filter out very short ones
  const terms = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (terms.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // ------------------------------------------------------------------
  // 1. Search products (equipment + accessories + parts)
  // ------------------------------------------------------------------
  // For multi-word queries, each word must match somewhere in the row.
  // We chain .or() calls — each one requires that term to appear in
  // at least one of the searchable columns.
  const productColumns = ["title", "sku", "brand", "short_description", "model_number"];

  let productQuery = supabase
    .from("products")
    .select("id, sku, brand, title, thumbnail_url, product_type")
    .eq("is_active", true);

  for (const term of terms) {
    productQuery = productQuery.or(buildTermFilter(term, productColumns));
  }

  const { data: products } = await productQuery
    .order("created_at", { ascending: false })
    .limit(MAX_RESULTS);

  // ------------------------------------------------------------------
  // 2. Search system packages
  // ------------------------------------------------------------------
  const systemColumns = ["title", "system_sku", "description"];

  let systemQuery = supabase
    .from("system_packages")
    .select("id, system_sku, title, thumbnail_url, ahri_number")
    .eq("is_active", true);

  for (const term of terms) {
    systemQuery = systemQuery.or(buildTermFilter(term, systemColumns));
  }

  const { data: systems } = await systemQuery
    .order("created_at", { ascending: false })
    .limit(4);

  // ------------------------------------------------------------------
  // 3. Batch-fetch Retail pricing for all matched entities
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
  // 4. Build unified suggestion list
  // ------------------------------------------------------------------
  const suggestions: SearchSuggestion[] = [];

  for (const p of products ?? []) {
    const pr = pricingMap.get(`product-${p.id}`);
    // Skip products without retail pricing (unpriced items)
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
      price: pr?.price ?? null,
      msrp: pr?.msrp ?? null,
    });
  }

  // Cap total results
  const limited = suggestions.slice(0, MAX_RESULTS);

  return NextResponse.json({
    suggestions: limited,
    total: (products?.length ?? 0) + (systems?.length ?? 0),
    query: q,
  });
}
