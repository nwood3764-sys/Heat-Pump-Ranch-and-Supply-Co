import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";

export const metadata = { title: "Catalog" };
// Catalog reflects DB rows that change at most once a night during the
// scrape cron. 60s ISR makes pagination + filter clicks instant for
// repeat visitors without serving stale data for more than a minute.
export const revalidate = 60;

interface SearchParams {
  q?: string;
  category?: string;
  brand?: string;
  type?: string;
  page?: string;
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

  const supabase = await createClient();

  // ---- Determine entity to render -----------------------------------------
  // type=systems → query system_packages
  // type=accessories → query products with product_type='accessory'
  // type=parts → query products with product_type='part'
  // (no type) → query products with product_type='equipment'
  const showSystems = sp.type === "systems";

  if (showSystems) {
    return await renderSystems(sp, page, offset);
  }
  return await renderProducts(sp, page, offset);
}

async function renderProducts(sp: SearchParams, page: number, offset: number) {
  const supabase = await createClient();

  let productType: "equipment" | "accessory" | "part" = "equipment";
  if (sp.type === "accessories") productType = "accessory";
  else if (sp.type === "parts") productType = "part";

  let query = supabase
    .from("products")
    .select("id, sku, brand, title, thumbnail_url, category_id", { count: "exact" })
    .eq("is_active", true)
    .eq("product_type", productType);

  if (sp.brand) query = query.ilike("brand", sp.brand);
  if (sp.q) query = query.ilike("title", `%${sp.q}%`);

  if (sp.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", sp.category)
      .maybeSingle();
    if (cat?.id) query = query.eq("category_id", cat.id);
  }

  const { data: products, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Batch pricing
  const ids = (products ?? []).map((p) => p.id);
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

  const cards: ProductCardData[] = (products ?? []).map((p) => {
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

  const ids = (systems ?? []).map((s) => s.id);
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

  const cards: ProductCardData[] = (systems ?? []).map((s) => {
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
    if (sp.brand) return sp.brand;
    if (sp.category) return sp.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return "All Equipment";
  };

  return (
    <div className="container py-8">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
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

        {/* Quick type tabs */}
        <div className="flex gap-1 text-sm flex-wrap">
          <TabLink current={!sp.type} href="/catalog">Equipment</TabLink>
          <TabLink current={sp.type === "systems"} href="/catalog?type=systems">Systems</TabLink>
          <TabLink current={sp.type === "accessories"} href="/catalog?type=accessories">Accessories</TabLink>
          <TabLink current={sp.type === "parts"} href="/catalog?type=parts">Parts</TabLink>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="border rounded-md p-12 text-center text-muted-foreground bg-card">
          <p className="mb-1">No products found.</p>
          <p className="text-sm">Try a different category or check back after the next sync.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cards.map((p) => (
              <ProductCard key={`${p.href}`} p={p} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {page > 1 && (
                <Link
                  href={qs(sp, { page: String(page - 1) })}
                  className="px-3 py-1.5 rounded-md border hover:border-primary text-sm"
                >
                  ← Previous
                </Link>
              )}
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={qs(sp, { page: String(page + 1) })}
                  className="px-3 py-1.5 rounded-md border hover:border-primary text-sm"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabLink({
  current,
  href,
  children,
}: {
  current: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "px-3 py-1.5 rounded-md border text-sm " +
        (current
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card hover:border-primary")
      }
    >
      {children}
    </Link>
  );
}

function qs(sp: SearchParams, override: Partial<SearchParams>): string {
  const params = new URLSearchParams();
  const merged = { ...sp, ...override };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, String(v));
  }
  return `/catalog${params.toString() ? "?" + params.toString() : ""}`;
}
