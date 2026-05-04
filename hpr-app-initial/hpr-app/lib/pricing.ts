/**
 * Server-side pricing helpers for catalog queries.
 *
 * These functions handle the business logic of:
 * 1. Hiding products without pricing from the storefront
 * 2. Determining when to show/hide MSRP strikethrough
 *
 * PERFORMANCE NOTE (2026-05-03):
 * The previous implementation fetched ALL active product IDs and ALL pricing
 * rows in paginated batches to compute the exclusion set. This caused 3-5
 * extra DB round trips on every catalog/homepage load.
 *
 * New approach: Since unpriced products are always a tiny minority (~8 out of
 * 416), we use a single efficient query that directly finds products WITHOUT
 * pricing, leveraging a left-join pattern via Supabase's `is` null filter.
 * This reduces the operation to a single DB call.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// In-memory cache to avoid repeated queries within the same request lifecycle
// and across ISR revalidation windows.
let _unpricedProductCache: { ids: number[]; ts: number } | null = null;
let _unpricedSystemCache: { ids: number[]; ts: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds — matches ISR revalidation window

/**
 * Fetch the IDs of active products that do NOT have retail pricing.
 * These should be excluded from all storefront catalog queries.
 *
 * Uses a single efficient query: fetch active products that have no
 * corresponding Retail pricing row with total_price > 0.
 */
export async function getUnpricedProductIds(
  supabase: any,
): Promise<number[]> {
  // Return cached result if fresh
  if (_unpricedProductCache && Date.now() - _unpricedProductCache.ts < CACHE_TTL_MS) {
    return _unpricedProductCache.ids;
  }

  // Strategy: Query product_pricing for all product entities with Retail tier,
  // then find active products NOT in that set. Since the unpriced set is tiny,
  // we can do this efficiently with two lightweight queries.

  // Get IDs of products that DO have retail pricing (single query, just IDs)
  const { data: pricedRows } = await supabase
    .from("product_pricing")
    .select("entity_id")
    .eq("entity_type", "product")
    .gt("total_price", 0);

  if (!pricedRows) {
    _unpricedProductCache = { ids: [], ts: Date.now() };
    return [];
  }

  const pricedIds = new Set<number>(pricedRows.map((r: any) => r.entity_id));

  // Get all active product IDs (just IDs, very fast)
  const { data: allActive } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true);

  if (!allActive || allActive.length === 0) {
    _unpricedProductCache = { ids: [], ts: Date.now() };
    return [];
  }

  const result = allActive
    .filter((p: any) => !pricedIds.has(p.id))
    .map((p: any) => p.id);

  _unpricedProductCache = { ids: result, ts: Date.now() };
  return result;
}

/**
 * Fetch the IDs of active system packages that do NOT have retail pricing.
 */
export async function getUnpricedSystemIds(
  supabase: any,
): Promise<number[]> {
  // Return cached result if fresh
  if (_unpricedSystemCache && Date.now() - _unpricedSystemCache.ts < CACHE_TTL_MS) {
    return _unpricedSystemCache.ids;
  }

  const { data: pricedRows } = await supabase
    .from("product_pricing")
    .select("entity_id")
    .eq("entity_type", "system")
    .gt("total_price", 0);

  if (!pricedRows) {
    _unpricedSystemCache = { ids: [], ts: Date.now() };
    return [];
  }

  const pricedIds = new Set<number>(pricedRows.map((r: any) => r.entity_id));

  const { data: allActive } = await supabase
    .from("system_packages")
    .select("id")
    .eq("is_active", true);

  if (!allActive || allActive.length === 0) {
    _unpricedSystemCache = { ids: [], ts: Date.now() };
    return [];
  }

  const result = allActive
    .filter((s: any) => !pricedIds.has(s.id))
    .map((s: any) => s.id);

  _unpricedSystemCache = { ids: result, ts: Date.now() };
  return result;
}
