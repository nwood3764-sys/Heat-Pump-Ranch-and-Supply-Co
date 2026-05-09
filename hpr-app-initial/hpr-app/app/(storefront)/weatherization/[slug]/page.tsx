import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";
import {
  WEATHERIZATION_SUB_CATEGORIES,
  type WeatherizationProduct,
} from "@/lib/weatherization-products";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sub = WEATHERIZATION_SUB_CATEGORIES[slug];
  if (!sub) return { title: "Not Found" };
  return {
    title: `${sub.title} — Weatherization Materials`,
    description: sub.description,
  };
}

export function generateStaticParams() {
  return Object.keys(WEATHERIZATION_SUB_CATEGORIES).map((slug) => ({ slug }));
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function WeatherizationSubCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sub = WEATHERIZATION_SUB_CATEGORIES[slug];
  if (!sub) notFound();

  return (
    <>
      {/* Page Header */}
      <section className="bg-[#2d6a7a] text-white py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{sub.title}</h1>
          <p className="text-white/80 max-w-2xl">{sub.description}</p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="container pt-4 pb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/weatherization"
            className="hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Weatherization Materials
          </Link>
          <span>/</span>
          <span className="text-foreground">{sub.title}</span>
        </div>
      </div>

      {/* Product grid */}
      <section className="container py-8 md:py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">
              {sub.products.length}{" "}
              {sub.products.length === 1 ? "Product" : "Products"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sub.products.map((product) => (
            <WeatherizationProductCard
              key={product.slug}
              product={product}
              subCategorySlug={slug}
            />
          ))}
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Product card component
// ---------------------------------------------------------------------------

function WeatherizationProductCard({
  product,
  subCategorySlug,
}: {
  product: WeatherizationProduct;
  subCategorySlug: string;
}) {
  return (
    <Card className="group relative overflow-hidden flex flex-col h-full transition-shadow hover:shadow-md">
      <Link
        href={`/weatherization/${subCategorySlug}/${product.slug}`}
        className="block"
      >
        <div className="aspect-square bg-muted/30 flex items-center justify-center p-6 border-b">
          {product.thumbnailUrl ? (
            <Image
              src={product.thumbnailUrl}
              alt={product.title}
              width={300}
              height={300}
              className="max-h-full max-w-full object-contain"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
            />
          ) : (
            <Package className="h-16 w-16 text-muted-foreground/30" />
          )}
        </div>
      </Link>

      <CardContent className="p-4 flex flex-col flex-1">
        <Link
          href={`/weatherization/${subCategorySlug}/${product.slug}`}
          className="block mb-2"
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {product.brand}
          </div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-3 group-hover:text-primary">
            {product.title}
          </h3>
        </Link>

        {/* Quick specs */}
        <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
          <div>{product.bagSize} bag</div>
          {product.rValuePerInch && <div>R-{product.rValuePerInch}/inch</div>}
          {product.coverage && <div>{product.coverage}</div>}
        </div>

        <div className="mt-auto">
          {/* Pricing placeholder */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Phone className="h-3.5 w-3.5" />
            <span className="font-medium">Call for Contractor Pricing</span>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/weatherization/${subCategorySlug}/${product.slug}`}
              className="flex-1"
            >
              <Button
                size="sm"
                variant="outline"
                className="w-full border-[#2d6a7a] text-[#2d6a7a] hover:bg-[#2d6a7a] hover:text-white"
              >
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
