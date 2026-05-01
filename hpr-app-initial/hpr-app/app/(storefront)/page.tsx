import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TrustStrip } from "@/components/storefront/trust-strip";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";

const brands = [
  { name: "ACiQ", href: "/catalog?brand=ACIQ" },
  { name: "LG", href: "/catalog?brand=LG" },
];

export default async function HomePage() {
  const supabase = await createClient();

  // Hero grid: only categories with products, using a sample product
  // thumbnail. Avoids dead links into empty categories and dodges the
  // missing /public/categories/*.jpg static assets entirely.
  let heroCategories: { name: string; href: string; thumb: string | null; n: number }[] = [];
  const { data: cats } = await supabase
    .from("categories")
    .select("id, slug, name, sort_order")
    .order("sort_order", { ascending: true });
  const catIds = (cats ?? []).map((c) => c.id);
  if (catIds.length > 0) {
    const { data: prods } = await supabase
      .from("products")
      .select("category_id, thumbnail_url")
      .eq("is_active", true)
      .in("category_id", catIds)
      .not("thumbnail_url", "is", null);
    const sample = new Map<number, string>();
    const counts = new Map<number, number>();
    for (const row of prods ?? []) {
      if (row.category_id == null) continue;
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
      if (!sample.has(row.category_id) && row.thumbnail_url) {
        sample.set(row.category_id, row.thumbnail_url);
      }
    }
    heroCategories = (cats ?? [])
      .filter((c) => (counts.get(c.id) ?? 0) > 0)
      .map((c) => ({
        name: c.name,
        href: `/catalog?category=${c.slug}`,
        thumb: sample.get(c.id) ?? null,
        n: counts.get(c.id) ?? 0,
      }));
  }

  // Featured equipment — newest active products
  const { data: products } = await supabase
    .from("products")
    .select("id, sku, brand, title, thumbnail_url")
    .eq("is_active", true)
    .eq("product_type", "equipment")
    .order("created_at", { ascending: false })
    .limit(8);

  const productIds = (products ?? []).map((p) => p.id);
  const pricingMap = new Map<number, { price: string; msrp: string | null }>();
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
      href: `/product/${encodeURIComponent(p.sku)}`,
      price: pricing?.price ?? null,
      msrp: pricing?.msrp ?? null,
    };
  });

  return (
    <>
      {/* Hero: data-driven category grid (only categories with products) */}
      {heroCategories.length > 0 && (
        <section className="bg-card border-b">
          <div className="container py-6 md:py-10">
            <h1 className="sr-only">The Heat Pump Ranch & Supply Co.</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {heroCategories.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="group relative aspect-[4/3] rounded-md border overflow-hidden bg-muted/30 hover:border-primary transition-colors"
                >
                  {c.thumb ? (
                    <Image
                      src={c.thumb}
                      alt={c.name}
                      fill
                      className="object-contain p-6"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <div className="font-semibold text-sm md:text-base">{c.name}</div>
                    <div className="text-xs text-white/80">{c.n} {c.n === 1 ? "product" : "products"}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
