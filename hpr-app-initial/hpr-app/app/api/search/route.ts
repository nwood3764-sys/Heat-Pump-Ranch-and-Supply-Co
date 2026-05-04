import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveKeywordFilters } from "@/lib/search-keywords";

/**
 * GET /api/search?q=<term>
 *
 * Returns up to 8 product/system suggestions for the universal search
 * autocomplete.
 *
 * PERFORMANCE OPTIMIZATIONS (2026-05-03):
 * - Product and system queries run in PARALLEL (Promise.all)
 * - Pricing queries also run in parallel with each other
 * - Response includes Cache-Control for CDN edge caching (10s)
 * - Reduced from sequential waterfall to 2 parallel rounds
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
    return NextResponse.json({ suggestions: [], total: 0, query: q });
  }

  const supabase = await createClient();

  const terms = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (terms.length === 0) {
    return NextResponse.json({ suggestions: [], total: 0, query: q });
  }

  // Check for keyword-to-filter mappings
  const keywordFilters = resolveKeywordFilters(q);

  // ------------------------------------------------------------------
  // 1. Build product + system queries (run in PARALLEL)
  // ------------------------------------------------------------------
  const productColumns = ["title", "sku", "brand", "short_description", "model_number"];
  const systemColumns = ["title", "system_sku", "description"];

  let productQuery = supabase
    .from("products")
    .select("id, sku, brand, title, thumbnail_url, product_type")
    .eq("is_active", true);

  let systemQuery = supabase
    .from("system_packages")
    .select("id, system_sku, title, thumbnail_url, ahri_number")
    .eq("is_active", true);

  if (keywordFilters.length > 0) {
    // Products: combined text + spec OR
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

    // Systems: combined text + spec OR
    const sysTextParts: string[] = [];
    for (const term of terms) {
      const p = `%${term}%`;
      for (const col of systemColumns) {
        sysTextParts.push(`${col}.ilike.${p}`);
      }
    }
    systemQuery = systemQuery.or([...sysTextParts, ...specParts].join(","));
  } else {
    // Standard multi-word text search
    for (const term of terms) {
      const p = `%${term}%`;
      productQuery = productQuery.or(
        productColumns.map((col) => `${col}.ilike.${p}`).join(",")
      );
      systemQuery = systemQuery.or(
        systemColumns.map((col) => `${col}.ilike.${p}`).join(",")
      );
    }
  }

  // Execute BOTH searches in parallel
  const [{ data: products }, { data: systems }] = await Promise.all([
    productQuery.order("created_at", { ascending: false }).limit(MAX_RESULTS * 2),
    systemQuery.order("created_at", { ascending: false }).limit(MAX_RESULTS),
  ]);

  // ------------------------------------------------------------------
  // 2. Batch-fetch Retail pricing (PARALLEL for products + systems)
  // ------------------------------------------------------------------
  const productIds = (products ?? []).map((p) => p.id);
  const systemIds = (systems ?? []).map((s) => s.id);

  const pricingMap = new Map<string, { price: string; msrp: string | null }>();

  // Build pricing queries and run in parallel
  const pricingPromises: Array<Promise<void> | PromiseLike<void>> = [];

  if (productIds.length > 0) {
    pricingPromises.push(
      supabase
        .from("product_pricing")
        .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
        .eq("entity_type", "product")
        .in("entity_id", productIds)
        .then(({ data: pricing }) => {
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
        })
    );
  }

  if (systemIds.length > 0) {
    pricingPromises.push(
      supabase
        .from("product_pricing")
        .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
        .eq("entity_type", "system")
        .in("entity_id", systemIds)
        .then(({ data: pricing }) => {
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
        })
    );
  }

  await Promise.all(pricingPromises);

  // ------------------------------------------------------------------
  // 3. Build unified suggestion list (only priced items)
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

  // Cache search results at the edge for 10 seconds to handle rapid
  // typing/debounce patterns without hitting the DB repeatedly
  const response = NextResponse.json({
    suggestions: limited,
    total: suggestions.length,
    query: q,
  });
  response.headers.set("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
  return response;
}
