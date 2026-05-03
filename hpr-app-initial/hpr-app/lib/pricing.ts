/**
 * Server-side pricing helpers for catalog queries.
 *
 * These functions handle the business logic of:
 * 1. Hiding products without pricing from the storefront
 * 2. Determining when to show/hide MSRP strikethrough
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Fetch the IDs of active products that do NOT have retail pricing.
 * These should be excluded from all storefront catalog queries.
 *
 * Strategy: since unpriced products are always a small minority (currently 8),
 * we fetch all active product IDs and subtract those with pricing rows.
 * This is more efficient than passing 400+ IDs in an IN clause.
 */
export async function getUnpricedProductIds(
  supabase: any,
): Promise<number[]> {
  // Get all active product IDs
  const { data: allActive } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true);

  if (!allActive || allActive.length === 0) return [];

  // Get all entity_ids that have Retail pricing with total_price > 0
  // Paginate since there could be >1000 rows
  const pricedIds = new Set<number>();
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data } = await supabase
      .from("product_pricing")
      .select("entity_id, pricing_tiers!inner(name)")
      .eq("entity_type", "product")
      .eq("pricing_tiers.name", "Retail")
      .gt("total_price", 0)
      .range(from, from + batchSize - 1);
    if (!data || data.length === 0) break;
    for (const row of data) {
      pricedIds.add((row as { entity_id: number }).entity_id);
    }
    if (data.length < batchSize) break;
    from += batchSize;
  }

  // Return IDs of active products that have no pricing
  return allActive
    .filter((p: any) => !pricedIds.has(p.id))
    .map((p: any) => p.id);
}

/**
 * Fetch the IDs of active system packages that do NOT have retail pricing.
 */
export async function getUnpricedSystemIds(
  supabase: any,
): Promise<number[]> {
  const { data: allActive } = await supabase
    .from("system_packages")
    .select("id")
    .eq("is_active", true);

  if (!allActive || allActive.length === 0) return [];

  const pricedIds = new Set<number>();
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data } = await supabase
      .from("product_pricing")
      .select("entity_id, pricing_tiers!inner(name)")
      .eq("entity_type", "system")
      .eq("pricing_tiers.name", "Retail")
      .gt("total_price", 0)
      .range(from, from + batchSize - 1);
    if (!data || data.length === 0) break;
    for (const row of data) {
      pricedIds.add((row as { entity_id: number }).entity_id);
    }
    if (data.length < batchSize) break;
    from += batchSize;
  }

  return allActive
    .filter((s: any) => !pricedIds.has(s.id))
    .map((s: any) => s.id);
}
