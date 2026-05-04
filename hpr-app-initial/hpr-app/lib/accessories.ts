import { createClient } from "@/lib/supabase/server";

/**
 * Accessory category display configuration.
 * Maps the `notes` column in accessory_compatibility to display labels and sort order.
 */
export const ACCESSORY_CATEGORY_CONFIG: Record<
  string,
  { label: string; sortOrder: number }
> = {
  "line-sets": { label: "Pre-charged Line Sets", sortOrder: 1 },
  "equipment-mounting": { label: "Mounting Options", sortOrder: 2 },
  "heater-coils": { label: "Electric Heat Kit Options", sortOrder: 3 },
  "heat-kits": { label: "Electric Heat Kit Options", sortOrder: 3 },
  "thermostats": { label: "Recommended: Wall-Mounted Thermostats", sortOrder: 4 },
  "condensate-management": { label: "Condensate Management", sortOrder: 5 },
};

export interface AccessoryItem {
  id: number;
  sku: string;
  title: string;
  thumbnailUrl: string | null;
  price: number | null;
  msrp: number | null;
  ruleType: string;
}

export interface AccessoryGroup {
  category: string;
  label: string;
  sortOrder: number;
  items: AccessoryItem[];
}

/**
 * Fetch compatible accessories for a system package, grouped by category.
 */
export async function getAccessoriesForSystem(
  systemId: number,
): Promise<AccessoryGroup[]> {
  const supabase = await createClient();

  // Fetch compatibility rows with joined product data
  const { data: compatRows, error } = await supabase
    .from("accessory_compatibility")
    .select(
      `
      rule_type,
      notes,
      products:accessory_product_id (
        id,
        sku,
        title,
        thumbnail_url
      )
    `,
    )
    .eq("compatible_system_id", systemId);

  if (error || !compatRows || compatRows.length === 0) {
    return [];
  }

  // Get pricing for all accessory product IDs
  const productIds = compatRows
    .map((r: any) => r.products?.id)
    .filter(Boolean);

  const { data: pricingRows } = await supabase
    .from("product_pricing")
    .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
    .eq("entity_type", "product")
    .in("entity_id", productIds);

  // Build pricing lookup
  const pricingMap = new Map<number, { price: number | null; msrp: number | null }>();
  for (const row of (pricingRows ?? []) as Array<{
    entity_id: number;
    total_price: number | null;
    msrp: number | null;
    pricing_tiers: { name: string } | { name: string }[];
  }>) {
    const tierName = Array.isArray(row.pricing_tiers)
      ? row.pricing_tiers[0]?.name
      : row.pricing_tiers?.name;
    if (tierName === "Retail") {
      pricingMap.set(row.entity_id, {
        price: row.total_price,
        msrp: row.msrp,
      });
    }
  }

  // Group by category
  const groupMap = new Map<string, AccessoryGroup>();

  for (const row of compatRows) {
    const product = (row as any).products;
    if (!product) continue;

    const category = (row as any).notes || "other";
    const config = ACCESSORY_CATEGORY_CONFIG[category];
    if (!config) continue; // Skip unconfigured categories

    const pricing = pricingMap.get(product.id);

    const item: AccessoryItem = {
      id: product.id,
      sku: product.sku,
      title: product.title,
      thumbnailUrl: product.thumbnail_url,
      price: pricing?.price ?? null,
      msrp: pricing?.msrp ?? null,
      ruleType: (row as any).rule_type,
    };

    if (!groupMap.has(config.label)) {
      groupMap.set(config.label, {
        category,
        label: config.label,
        sortOrder: config.sortOrder,
        items: [],
      });
    }
    groupMap.get(config.label)!.items.push(item);
  }

  // Sort groups by sortOrder, deduplicate items within groups
  const groups = [...groupMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((group) => {
      // Deduplicate by product ID
      const seen = new Set<number>();
      group.items = group.items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      // Sort items by price (cheapest first), nulls last
      group.items.sort((a, b) => {
        if (a.price === null && b.price === null) return 0;
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return a.price - b.price;
      });
      return group;
    });

  return groups;
}

/**
 * Fetch compatible accessories for a product (equipment), grouped by category.
 * Uses the same logic but queries compatible_product_id instead.
 */
export async function getAccessoriesForProduct(
  productId: number,
): Promise<AccessoryGroup[]> {
  const supabase = await createClient();

  const { data: compatRows, error } = await supabase
    .from("accessory_compatibility")
    .select(
      `
      rule_type,
      notes,
      products:accessory_product_id (
        id,
        sku,
        title,
        thumbnail_url
      )
    `,
    )
    .eq("compatible_product_id", productId);

  if (error || !compatRows || compatRows.length === 0) {
    return [];
  }

  // Get pricing for all accessory product IDs
  const productIds = compatRows
    .map((r: any) => r.products?.id)
    .filter(Boolean);

  const { data: pricingRows } = await supabase
    .from("product_pricing")
    .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
    .eq("entity_type", "product")
    .in("entity_id", productIds);

  const pricingMap = new Map<number, { price: number | null; msrp: number | null }>();
  for (const row of (pricingRows ?? []) as Array<{
    entity_id: number;
    total_price: number | null;
    msrp: number | null;
    pricing_tiers: { name: string } | { name: string }[];
  }>) {
    const tierName = Array.isArray(row.pricing_tiers)
      ? row.pricing_tiers[0]?.name
      : row.pricing_tiers?.name;
    if (tierName === "Retail") {
      pricingMap.set(row.entity_id, {
        price: row.total_price,
        msrp: row.msrp,
      });
    }
  }

  const groupMap = new Map<string, AccessoryGroup>();

  for (const row of compatRows) {
    const product = (row as any).products;
    if (!product) continue;

    const category = (row as any).notes || "other";
    const config = ACCESSORY_CATEGORY_CONFIG[category];
    if (!config) continue;

    const pricing = pricingMap.get(product.id);

    const item: AccessoryItem = {
      id: product.id,
      sku: product.sku,
      title: product.title,
      thumbnailUrl: product.thumbnail_url,
      price: pricing?.price ?? null,
      msrp: pricing?.msrp ?? null,
      ruleType: (row as any).rule_type,
    };

    if (!groupMap.has(config.label)) {
      groupMap.set(config.label, {
        category,
        label: config.label,
        sortOrder: config.sortOrder,
        items: [],
      });
    }
    groupMap.get(config.label)!.items.push(item);
  }

  const groups = [...groupMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((group) => {
      const seen = new Set<number>();
      group.items = group.items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      group.items.sort((a, b) => {
        if (a.price === null && b.price === null) return 0;
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return a.price - b.price;
      });
      return group;
    });

  return groups;
}
