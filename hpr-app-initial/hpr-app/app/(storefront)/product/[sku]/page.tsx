import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Package, Video, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { ProductTabs } from "./product-tabs";
import { AddToProjectButton } from "@/components/storefront/add-to-project-button";

// 5-minute ISR: detail pages are heavier than the catalog (gallery,
// specs, docs, pricing) but their content rarely changes mid-day.
export const revalidate = 300;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku: rawSku } = await params;
  const sku = decodeURIComponent(rawSku);
  const supabase = await createClient();

  // products.sku is citext, so case-insensitive match is automatic.
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, sku, brand, title, model_number, description, short_description, specs, thumbnail_url, source_url, category_id",
    )
    .eq("sku", sku)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) notFound();

  const [{ data: images }, { data: docs }, { data: pricing }, { data: category }] =
    await Promise.all([
      supabase
        .from("product_images")
        .select("url, alt_text, is_primary, sort_order")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("product_documents")
        .select("url, file_name, doc_type")
        .eq("product_id", product.id),
      supabase
        .from("product_pricing")
        .select("total_price, msrp, pricing_tiers!inner(name)")
        .eq("entity_type", "product")
        .eq("entity_id", product.id),
      product.category_id
        ? supabase
            .from("categories")
            .select("slug, name")
            .eq("id", product.category_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const retail = (pricing ?? []).find((row) => {
    const t = Array.isArray(row.pricing_tiers) ? row.pricing_tiers[0] : row.pricing_tiers;
    return t?.name === "Retail";
  });
  const price = retail?.total_price ?? null;

  const gallery = (images ?? []).length > 0
    ? images!.map((i) => ({ url: i.url, alt: i.alt_text ?? product.title }))
    : product.thumbnail_url
      ? [{ url: product.thumbnail_url, alt: product.title }]
      : [];

  const primaryImage = gallery[0];

  // specs is a free-form JSONB; render the simple key/value pairs as a table,
  // skipping internal bookkeeping fields.
  const specEntries = Object.entries((product.specs ?? {}) as Record<string, unknown>)
    .filter(([k, v]) => {
      if (k === "all_skus" || k === "hvacdirect_breadcrumbs") return false;
      if (v === null || v === undefined) return false;
      if (typeof v === "object") return false;
      return true;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="container py-8">
      <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
        <Link href="/catalog" className="hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Catalog
        </Link>
        {category && (
          <>
            <span>/</span>
            <Link href={`/catalog?category=${category.slug}`} className="hover:text-primary">
              {category.name}
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div>
          <div className="aspect-square border rounded-md bg-muted/20 flex items-center justify-center p-8 mb-3 overflow-hidden">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.alt}
                width={600}
                height={600}
                className="max-h-full max-w-full object-contain"
                priority
              />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground/30" />
            )}
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {gallery.map((g, i) => (
                <div
                  key={i}
                  className="aspect-square border rounded-md bg-muted/20 flex items-center justify-center p-2 overflow-hidden"
                >
                  <Image
                    src={g.url}
                    alt={g.alt}
                    width={120}
                    height={120}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {product.brand}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2">{product.title}</h1>
          <div className="text-sm text-muted-foreground mb-4 font-mono">
            SKU {product.sku}
            {product.model_number && product.model_number !== product.sku && (
              <> &middot; Model {product.model_number}</>
            )}
          </div>

          <div className="border-y py-4 mb-4">
            {/* Our price */}
            {price ? (
              <div className="text-3xl font-bold text-green-700">{formatPrice(price)}</div>
            ) : (
              <div className="text-lg text-muted-foreground">Call for pricing</div>
            )}
          </div>

          <div className="flex gap-2 mb-6">
            {price ? (
              <AddToProjectButton
                entityType="product"
                entityId={product.id}
                size="lg"
                className="flex-1"
              />
            ) : (
              <Button size="lg" className="flex-1" disabled>
                Call for Pricing
              </Button>
            )}
          </div>

          {product.short_description && (
            <p className="text-sm leading-relaxed mb-4 text-foreground/80">
              {product.short_description}
            </p>
          )}
        </div>
      </div>

      {/* Tabbed content section */}
      <ProductTabs
        description={product.description}
        specEntries={specEntries}
        docs={docs ?? []}
      />
    </div>
  );
}
