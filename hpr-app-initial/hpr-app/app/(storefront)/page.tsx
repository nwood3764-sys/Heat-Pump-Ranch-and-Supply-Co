import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TrustStrip } from "@/components/storefront/trust-strip";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";

// Category cards rendered in the hero grid (the "Hero is a category grid" pattern).
// Images live in /public/categories/. Until the sync layer fills these in,
// they fall back to a neutral block.
const heroCategories = [
  { name: "AC & Furnace Systems", href: "/catalog?category=ac-furnace-systems", img: "/categories/ac-furnace.jpg" },
  { name: "Heat Pump Systems", href: "/catalog?category=heat-pump-systems", img: "/categories/heat-pump-systems.jpg" },
  { name: "Mini Split Systems", href: "/catalog?category=mini-splits", img: "/categories/mini-splits.jpg" },
  { name: "Furnaces", href: "/catalog?category=furnaces", img: "/categories/furnaces.jpg" },
  { name: "Air Conditioners", href: "/catalog?category=air-conditioners", img: "/categories/air-conditioners.jpg" },
  { name: "Heat Pumps", href: "/catalog?category=heat-pumps", img: "/categories/heat-pumps.jpg" },
  { name: "Air Handlers", href: "/catalog?category=air-handlers", img: "/categories/air-handlers.jpg" },
  { name: "Accessories", href: "/catalog?type=accessories", img: "/categories/accessories.jpg" },
];

const narrowCooling = [
  { name: "Heat Pump Systems", href: "/catalog?category=heat-pump-systems", img: "/categories/heat-pump-systems.jpg" },
  { name: "Air Conditioners", href: "/catalog?category=air-conditioners", img: "/categories/air-conditioners.jpg" },
  { name: "Air Conditioner Condensers", href: "/catalog?category=ac-condensers", img: "/categories/ac-condensers.jpg" },
  { name: "Heat Pump Condensers", href: "/catalog?category=heat-pump-condensers", img: "/categories/heat-pump-condensers.jpg" },
  { name: "Mini Split Systems", href: "/catalog?category=mini-splits", img: "/categories/mini-splits.jpg" },
  { name: "Air Handlers", href: "/catalog?category=air-handlers", img: "/categories/air-handlers.jpg" },
];

const narrowHeating = [
  { name: "Furnace & AC Systems", href: "/catalog?category=ac-furnace-systems", img: "/categories/ac-furnace.jpg" },
  { name: "Heat Pump Systems", href: "/catalog?category=heat-pump-systems", img: "/categories/heat-pump-systems.jpg" },
  { name: "Furnaces", href: "/catalog?category=furnaces", img: "/categories/furnaces.jpg" },
  { name: "Heat Pump & Coil", href: "/catalog?category=heat-pump-coil", img: "/categories/heat-pump-coil.jpg" },
];

const brands = [
  { name: "LG", href: "/catalog?brand=LG", img: "/brands/lg.svg" },
  { name: "ACiQ", href: "/catalog?brand=ACIQ", img: "/brands/aciq.svg" },
];

export default async function HomePage() {
  const supabase = await createClient();

  // Featured equipment — newest active products
  const { data: products } = await supabase
    .from("products")
    .select("id, sku, brand, title, thumbnail_url")
    .eq("is_active", true)
    .eq("product_type", "equipment")
    .order("created_at", { ascending: false })
    .limit(8);

  // Pull retail pricing for those products in one batch
  const productIds = (products ?? []).map((p) => p.id);
  let pricingMap = new Map<number, { price: string; msrp: string | null }>();
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
          pricingMap.set(row.entity_id, { price: row.total_price, msrp: row.msrp });
        }
      }
    }
  }

  const productCards: ProductCardData[] = (products ?? []).map((p) => {
    const pricing = pricingMap.get(p.id);
    return {
      id: p.id,
      sku: p.sku,
      brand: p.brand,
      title: p.title,
      thumbnailUrl: p.thumbnail_url,
      href: `/product/${p.sku}`,
      price: pricing?.price ?? null,
      msrp: pricing?.msrp ?? null,
    };
  });

  return (
    <>
      {/* Hero: category grid (NOT a banner with two CTAs) */}
      <section className="bg-card border-b">
        <div className="container py-6 md:py-10">
          <h1 className="sr-only">The Heat Pump Ranch & Supply Co.</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
            {heroCategories.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group relative aspect-[4/3] rounded-md border overflow-hidden bg-muted/30 hover:border-primary transition-colors"
              >
                <Image
                  src={c.img}
                  alt={c.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white font-semibold text-sm md:text-base">
                  {c.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <TrustStrip />

      {/* Brands */}
      <section className="container py-10">
        <h2 className="text-xl font-bold mb-4">Brands We Carry</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
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

      {/* Featured Products — dense grid */}
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

      {/* Narrow Your Cooling */}
      <section className="container py-8">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Narrow Your Cooling Systems</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {narrowCooling.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col items-center text-center"
            >
              <div className="aspect-square w-full rounded-md border bg-card overflow-hidden mb-2 group-hover:border-primary transition-colors">
                <Image src={c.img} alt={c.name} width={150} height={150} className="w-full h-full object-cover" />
              </div>
              <div className="text-xs font-medium leading-tight">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Narrow Your Heating */}
      <section className="container py-8">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Narrow Your Heating Systems</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {narrowHeating.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col items-center text-center"
            >
              <div className="aspect-square w-full rounded-md border bg-card overflow-hidden mb-2 group-hover:border-primary transition-colors">
                <Image src={c.img} alt={c.name} width={150} height={150} className="w-full h-full object-cover" />
              </div>
              <div className="text-xs font-medium leading-tight">{c.name}</div>
            </Link>
          ))}
        </div>
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
