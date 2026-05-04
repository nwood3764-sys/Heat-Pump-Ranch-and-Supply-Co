import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TrustStrip } from "@/components/storefront/trust-strip";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { getUnpricedProductIds } from "@/lib/pricing";

export const revalidate = 60;

// ---------------------------------------------------------------------------
// High-level product tile definitions — these map directly to our filter schema
// ---------------------------------------------------------------------------

const PRODUCT_TILES = [
  {
    label: "Ducted Heat Pump Systems",
    description: "Central heat pumps, air handlers, coils & furnaces",
    href: "/catalog?system_type=ducted",
    specFilter: { key: "system_type", value: "ducted" },
    staticImage: "/tiles/ducted-system.jpg",
  },
  {
    label: "Ductless Mini-Split Systems",
    description: "Wall mount, ceiling cassette, floor mount & concealed duct",
    href: "/catalog?system_type=non-ducted",
    specFilter: { key: "system_type", value: "non-ducted" },
    staticImage: "/tiles/ductless-system.jpg",
  },
  {
    label: "Water Heaters",
    description: "Heat pump water heaters for efficient hot water",
    href: "/catalog?system_type=water-heater",
    specFilter: { key: "system_type", value: "water-heater" }
  },
  {
    label: "Controls & Thermostats",
    description: "Smart thermostats, sensors & system controls",
    href: "/catalog?product_category=accessories-parts",
    specFilter: null,
    staticImage: "/tiles/controls-thermostats.png",
  },
  {
    label: "Accessories",
    description: "Line sets, mounting brackets, pads & installation supplies",
    href: "/accessories",
    specFilter: null,
    staticImage: "/tiles/accessories.jpg",
  },
  {
    label: "Parts",
    description: "Replacement compressors, capacitors & components",
    href: "/catalog?type=parts",
    specFilter: null,
    staticImage: "/tiles/parts.jpg",
  },
];

const brands = [
  { name: "ACiQ", href: "/catalog?brand=ACIQ" },
  { name: "LG", href: "/catalog?brand=LG" },
];

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch a representative thumbnail + product count for each tile bucket
  const tileData = await Promise.all(
    PRODUCT_TILES.map(async (tile) => {
      if (!tile.specFilter) {
        return { ...tile, thumb: (tile as any).staticImage ?? null, count: 0 };
      }
      const [thumbRes, countRes] = await Promise.all([
        supabase
          .from("products")
          .select("thumbnail_url")
          .eq("is_active", true)
          .eq("brand", "LG")
          .eq(`specs->>${tile.specFilter.key}`, tile.specFilter.value)
          .not("thumbnail_url", "is", null)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .eq(`specs->>${tile.specFilter.key}`, tile.specFilter.value),
      ]);
      return {
        ...tile,
        thumb: (tile as any).staticImage ?? thumbRes.data?.thumbnail_url ?? null,
        count: countRes.count ?? 0,
      };
    }),
  );

  // Featured products — exclude unpriced products
  const unpricedIds = await getUnpricedProductIds(supabase);
  const [featuredRes, productIds_] = await (async () => {
    let q = supabase
      .from("products")
      .select("id, sku, brand, title, thumbnail_url")
      .eq("is_active", true)
      .eq("product_type", "equipment")
      .not("thumbnail_url", "is", null);
    if (unpricedIds.length > 0) {
      q = q.not("id", "in", `(${unpricedIds.join(",")})`);
    }
    const res = await q
      .order("created_at", { ascending: false })
      .limit(8);
    return [res, (res.data ?? []).map((p) => p.id)] as const;
  })();
  const products = featuredRes.data ?? [];

  const pricingRes =
    productIds_.length > 0
      ? await supabase
          .from("product_pricing")
          .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
          .eq("entity_type", "product")
          .in("entity_id", productIds_)
      : { data: [] as Array<{ entity_id: number; total_price: string; msrp: string | null; pricing_tiers: { name: string } | { name: string }[] }> };

  const pricingMap = new Map<number, { price: string; msrp: string | null }>();
  for (const row of ((pricingRes.data ?? []) as Array<{
    entity_id: number;
    total_price: string;
    msrp: string | null;
    pricing_tiers: { name: string } | { name: string }[];
  }>)) {
    const tierName = Array.isArray(row.pricing_tiers)
      ? row.pricing_tiers[0]?.name
      : row.pricing_tiers?.name;
    if (tierName === "Retail") {
      pricingMap.set(row.entity_id, { price: row.total_price, msrp: row.msrp });
    }
  }

  const productCards: ProductCardData[] = products.map((p) => {
    const pricing = pricingMap.get(p.id);
    return {
      id: p.id,
      sku: p.sku,
      brand: p.brand,
      title: p.title,
      thumbnailUrl: p.thumbnail_url,
      href: `/product/${encodeURIComponent(p.sku)}`,
      price: pricing?.price ?? null,
      msrp: pricing?.msrp ?? null,
    };
  });

  return (
    <>
      {/* Hero: High-level product tile grid */}
      <section className="bg-card border-b">
        <div className="container py-6 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Shop by Category
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Residential and light-commercial HVAC equipment, system packages, and supplies.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {tileData.map((tile) => {
              return (
                <Link
                  key={tile.href}
                  href={tile.href}
                  className="group relative flex flex-col items-center rounded-lg border-2 border-border bg-background overflow-hidden hover:border-primary hover:shadow-md transition-all"
                >
                  {/* Image / Icon area */}
                  <div className="relative w-full aspect-[4/3] flex items-center justify-center bg-muted/20 p-4 md:p-6">
                    {tile.thumb ? (
                      <Image
                        src={tile.thumb}
                        alt={tile.label}
                        fill
                        className="object-contain p-4 md:p-6 group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    ) : (
                      <Package className="h-16 w-16 md:h-20 md:w-20 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Label area */}
                  <div className="w-full px-3 py-3 md:px-4 md:py-4 border-t bg-background text-center">
                    <div className="font-bold text-sm md:text-base leading-tight">
                      {tile.label}
                    </div>
                    <div className="text-[11px] md:text-xs text-muted-foreground mt-1 leading-snug hidden sm:block">
                      {tile.description}
                    </div>
                    {tile.count > 0 && (
                      <div className="text-[11px] text-primary font-semibold mt-1.5">
                        {tile.count} {tile.count === 1 ? "product" : "products"}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <TrustStrip />

      {/* Brands */}
      <section className="container py-10">
        <h2 className="text-xl font-bold mb-4">Brands We Carry</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {brands.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              className="border rounded-md aspect-[3/2] flex items-center justify-center bg-card hover:border-primary transition-colors p-4"
            >
              <span className="font-bold text-lg">{b.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container py-10">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Featured Equipment</h2>
          <Link href="/catalog" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {productCards.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {productCards.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="border rounded-md p-12 text-center text-muted-foreground bg-card">
            <p className="mb-2">No products yet.</p>
            <p className="text-sm">
              Once the LG and ACIQ syncs run, featured equipment will appear here.
            </p>
          </div>
        )}
      </section>

      {/* Contractor CTA */}
      <section className="bg-primary text-primary-foreground mt-10">
        <div className="container py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-1">Are You a Licensed Contractor?</h2>
            <p className="text-primary-foreground/80 text-sm">
              Apply for a contractor account for tier pricing, net terms, and saved quotes.
            </p>
          </div>
          <Link href="/contractor">
            <Button size="lg" variant="secondary" className="font-semibold">
              Apply Now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
