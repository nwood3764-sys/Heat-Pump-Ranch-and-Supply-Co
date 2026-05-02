import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { FilterSidebar, ActiveFilterTags } from "@/components/storefront/filter-sidebar";
import { FILTER_GROUPS } from "@/lib/filters";

export const metadata = { title: "Catalog" };
// Catalog reflects DB rows that change at most once a night during the
// scrape cron. 60s ISR makes pagination + filter clicks instant for
// repeat visitors without serving stale data for more than a minute.
export const revalidate = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */
interface SearchParams {
  q?: string;
  category?: string;
  brand?: string;
  type?: string;
  page?: string;
  // Dynamic filter keys from FILTER_GROUPS
  [key: string]: string | undefined;
}

const PAGE_SIZE = 24;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Determine entity to render
  const showSystems = sp.type === "systems";

  if (showSystems) {
    return await renderSystems(sp, page, offset);
  }
  return await renderProducts(sp, page, offset);
}

// ---------------------------------------------------------------------------
// Apply JSONB spec filters to a Supabase query
// ---------------------------------------------------------------------------

function applySpecFilters(query: any, sp: SearchParams): any {
  let q = query;

  // Brand filter (from sidebar, overrides old sp.brand)
  const brandFilter = sp.brand;
  if (brandFilter) {
    const brands = brandFilter.split(",");
    if (brands.length === 1) {
      q = q.ilike("brand", brands[0]);
    } else {
      q = q.in("brand", brands);
    }
  }

  // System type → specs->system_type
  if (sp.system_type) {
    const values = sp.system_type.split(",");
    if (values.length === 1) {
      q = q.eq("specs->>system_type", values[0]);
    } else {
      q = q.in("specs->>system_type", values);
    }
  }

  // Equipment type → specs->equipment_type
  if (sp.equipment_type) {
    const values = sp.equipment_type.split(",");
    if (values.length === 1) {
      q = q.eq("specs->>equipment_type", values[0]);
    } else {
      q = q.in("specs->>equipment_type", values);
    }
  }

  // Mount type → specs->mount_type
  if (sp.mount_type) {
    const values = sp.mount_type.split(",");
    if (values.length === 1) {
      q = q.eq("specs->>mount_type", values[0]);
    } else {
      q = q.in("specs->>mount_type", values);
    }
  }

  // Cooling capacity → specs->cooling_btu (numeric match)
  if (sp.cooling_btu) {
    const values = sp.cooling_btu.split(",");
    if (values.length === 1) {
      q = q.eq("specs->>cooling_btu", values[0]);
    } else {
      q = q.in("specs->>cooling_btu", values);
    }
  }

  // Heating capacity → specs->heating_btu (numeric match)
  if (sp.heating_btu) {
    const values = sp.heating_btu.split(",");
    if (values.length === 1) {
      q = q.eq("specs->>heating_btu", values[0]);
    } else {
      q = q.in("specs->>heating_btu", values);
    }
  }

  // Energy Star → specs->energy_star
  if (sp.energy_star) {
    const values = sp.energy_star.split(",");
    if (values.length === 1) {
      q = q.eq("specs->>energy_star", values[0]);
    }
    // If both yes and no selected, no filter needed
  }

  // Cold Climate → specs->cold_climate
  if (sp.cold_climate) {
    const values = sp.cold_climate.split(",");
    if (values.length === 1) {
      q = q.eq("specs->>cold_climate", values[0]);
    }
  }

  // SEER2 → specs->seer2 (range buckets)
  if (sp.seer2) {
    const ranges = sp.seer2.split(",");
    // Build OR conditions for SEER2 range buckets
    // Supabase JS doesn't natively support OR on JSONB ranges,
    // so we use .or() with raw filter strings
    const orParts: string[] = [];
    for (const r of ranges) {
      if (r === "14-16") {
        orParts.push("and(specs->>seer2.gte.14,specs->>seer2.lt.17)");
      } else if (r === "17-19") {
        orParts.push("and(specs->>seer2.gte.17,specs->>seer2.lt.20)");
      } else if (r === "20-22") {
        orParts.push("and(specs->>seer2.gte.20,specs->>seer2.lt.23)");
      } else if (r === "23+") {
        orParts.push("specs->>seer2.gte.23");
      }
    }
    if (orParts.length > 0) {
      q = q.or(orParts.join(","));
    }
  }

  // Zones → specs->zone_type
  if (sp.zones) {
    const values = sp.zones.split(",");
    if (values.length === 1) {
      q = q.eq("specs->>zone_type", values[0]);
    } else {
      q = q.in("specs->>zone_type", values);
    }
  }

  // Voltage → specs->voltage
  if (sp.voltage) {
    const values = sp.voltage.split(",");
    if (values.length === 1) {
      q = q.eq("specs->>voltage", values[0]);
    } else {
      q = q.in("specs->>voltage", values);
    }
  }

  return q;
}

// ---------------------------------------------------------------------------
// Product category filter → product_type mapping
// ---------------------------------------------------------------------------

function resolveProductType(sp: SearchParams): "equipment" | "accessory" | "part" | null {
  // Old-style type param takes precedence
  if (sp.type === "accessories") return "accessory";
  if (sp.type === "parts") return "part";

  // New sidebar product_category
  const pc = sp.product_category;
  if (pc === "accessories-parts") return "accessory";

  // Default to equipment
  return "equipment";
}

// ---------------------------------------------------------------------------
// Render products
// ---------------------------------------------------------------------------

async function renderProducts(sp: SearchParams, page: number, offset: number) {
  const supabase = await createClient();

  const productType = resolveProductType(sp);

  let query = supabase
    .from("products")
    .select("id, sku, brand, title, thumbnail_url, category_id, specs", { count: "exact" })
    .eq("is_active", true);

  if (productType) {
    query = query.eq("product_type", productType);
  }

  // Text search
  if (sp.q) query = query.ilike("title", `%${sp.q}%`);

  // Category (old-style)
  if (sp.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", sp.category)
      .maybeSingle();
    if ((cat as any)?.id) query = query.eq("category_id", (cat as any).id);
  }

  // Apply spec-based filters
  query = applySpecFilters(query, sp);

  const { data: products, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Batch pricing
  const ids = (products ?? []).map((p: any) => p.id);
  const pricingMap = new Map<number, { price: string; msrp: string | null }>();
  if (ids.length > 0) {
    const { data: pricing } = await supabase
      .from("product_pricing")
      .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
      .eq("entity_type", "product")
      .in("entity_id", ids);
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
          pricingMap.set(row.entity_id, { price: row.total_price, msrp: row.msrp });
        }
      }
    }
  }

  const cards: ProductCardData[] = (products ?? []).map((p: any) => {
    const pr = pricingMap.get(p.id);
    return {
      id: p.id,
      sku: p.sku,
      brand: p.brand,
      title: p.title,
      thumbnailUrl: p.thumbnail_url,
      href: `/product/${encodeURIComponent(p.sku)}`,
      price: pr?.price ?? null,
      msrp: pr?.msrp ?? null,
    };
  });

  return <CatalogShell sp={sp} page={page} count={count ?? 0} cards={cards} />;
}

// ---------------------------------------------------------------------------
// Render systems
// ---------------------------------------------------------------------------

async function renderSystems(sp: SearchParams, page: number, offset: number) {
  const supabase = await createClient();

  let query = supabase
    .from("system_packages")
    .select("id, system_sku, title, thumbnail_url, ahri_number", { count: "exact" })
    .eq("is_active", true);

  if (sp.q) query = query.ilike("title", `%${sp.q}%`);

  const { data: systems, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const ids = (systems ?? []).map((s: any) => s.id);
  const pricingMap = new Map<number, { price: string; msrp: string | null }>();
  if (ids.length > 0) {
    const { data: pricing } = await supabase
      .from("product_pricing")
      .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
      .eq("entity_type", "system")
      .in("entity_id", ids);
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
          pricingMap.set(row.entity_id, { price: row.total_price, msrp: row.msrp });
        }
      }
    }
  }

  const cards: ProductCardData[] = (systems ?? []).map((s: any) => {
    const pr = pricingMap.get(s.id);
    return {
      id: s.id,
      sku: s.system_sku,
      brand: s.ahri_number ? `AHRI #${s.ahri_number}` : "System",
      title: s.title,
      thumbnailUrl: s.thumbnail_url,
      href: `/system/${s.system_sku}`,
      price: pr?.price ?? null,
      msrp: pr?.msrp ?? null,
    };
  });

  return <CatalogShell sp={sp} page={page} count={count ?? 0} cards={cards} />;
}

// ---------------------------------------------------------------------------
// Shell layout — sidebar + product grid
// ---------------------------------------------------------------------------

function CatalogShell({
  sp,
  page,
  count,
  cards,
}: {
  sp: SearchParams;
  page: number;
  count: number;
  cards: ProductCardData[];
}) {
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const headingFor = (sp: SearchParams) => {
    if (sp.type === "systems") return "System Packages";
    if (sp.type === "accessories") return "Accessories";
    if (sp.type === "parts") return "Parts";
    if (sp.category)
      return sp.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return "All Equipment";
  };

  return (
    <div className="container py-8">
      <div className="flex gap-8">
        {/* Left sidebar — filters */}
        <Suspense fallback={<div className="w-[280px] shrink-0" />}>
          <FilterSidebar />
        </Suspense>

        {/* Right — product grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{headingFor(sp)}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {count.toLocaleString()} {count === 1 ? "result" : "results"}
                {sp.q && (
                  <>
                    {" "}
                    for <span className="italic">&ldquo;{sp.q}&rdquo;</span>
                  </>
                )}
              </p>
            </div>

            {/* Sort dropdown placeholder */}
            <select className="px-3 py-1.5 border rounded-md text-sm bg-card">
              <option>Sort: Default</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest</option>
            </select>
          </div>

          {/* Active filter tags */}
          <Suspense fallback={null}>
            <ActiveFilterTags className="mb-4" />
          </Suspense>

          {cards.length === 0 ? (
            <div className="border rounded-md p-12 text-center text-muted-foreground bg-card">
              <p className="mb-1">No products found.</p>
              <p className="text-sm">
                Try adjusting your filters or check back after the next sync.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((p) => (
                  <ProductCard key={`${p.href}`} p={p} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  {page > 1 && (
                    <Link
                      href={buildPaginationHref(sp, page - 1)}
                      className="px-3 py-1.5 rounded-md border hover:border-primary text-sm"
                    >
                      &larr; Previous
                    </Link>
                  )}
                  <span className="text-sm text-muted-foreground px-3">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={buildPaginationHref(sp, page + 1)}
                      className="px-3 py-1.5 rounded-md border hover:border-primary text-sm"
                    >
                      Next &rarr;
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPaginationHref(sp: SearchParams, targetPage: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "page") params.set(k, String(v));
  }
  if (targetPage > 1) params.set("page", String(targetPage));
  return `/catalog${params.toString() ? "?" + params.toString() : ""}`;
}
