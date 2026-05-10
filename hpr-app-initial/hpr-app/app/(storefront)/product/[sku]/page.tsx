import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Package, Video, BookOpen, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatPrice, calculateSavings } from "@/lib/utils";
import { cleanSpecEntries } from "@/lib/spec-display";
import { ProductTabs } from "./product-tabs";
import { AddToProjectButtonLazy as AddToProjectButton } from "@/components/storefront/add-to-project-button-lazy";
import { AccessorySelector } from "@/components/storefront/accessory-selector";
import { getAccessoriesForProduct } from "@/lib/accessories";

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
      "id, sku, brand, title, model_number, description, short_description, specs, thumbnail_url, source_url, category_id, product_type",
    )
    .eq("sku", sku)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) notFound();

  const specs = (product.specs ?? {}) as Record<string, unknown>;
  const isCompleteSystem = specs.product_category === "complete-systems";

  // -----------------------------------------------------------------------
  // If this product is a complete system, check for a matching system_package
  // that has richer data (AHRI ratings, components). If found, redirect there.
  // -----------------------------------------------------------------------
  if (isCompleteSystem) {
    // Try exact SKU match first, then LG-prefixed match
    const candidates = [sku, `LG-${sku}`];
    // For compound SKUs like "KUMXB181A / 2-KNMAB071A", also try the
    // hyphenated system_package format: "LG-KUMXB181A-2-KNMAB071A"
    if (sku.includes(" / ")) {
      const hyphenated = "LG-" + sku.replace(/ \/ /g, "-");
      candidates.push(hyphenated);
    }

    for (const candidate of candidates) {
      const { data: systemPkg } = await supabase
        .from("system_packages")
        .select("system_sku")
        .eq("system_sku", candidate)
        .eq("is_active", true)
        .maybeSingle();

      if (systemPkg) {
        redirect(`/system/${encodeURIComponent(systemPkg.system_sku)}`);
      }
    }
  }

  // -----------------------------------------------------------------------
  // No matching system_package — render the product page.
  // For complete-systems, we'll also look up related component products.
  // -----------------------------------------------------------------------

  const [{ data: images }, { data: docs }, { data: pricing }, { data: category }, accessoryGroups] =
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
      // Only fetch accessories for equipment products (not accessories themselves)
      product.product_type === "equipment"
        ? getAccessoriesForProduct(product.id)
        : Promise.resolve([]),
    ]);

  // For complete-systems, try to find component products using the all_skus
  // field or by parsing the compound SKU.
  let componentProducts: Array<{
    id: number;
    sku: string;
    title: string;
    thumbnailUrl: string | null;
    role: string;
    quantity: number;
  }> = [];

  if (isCompleteSystem) {
    const allSkus = (specs.all_skus as string[] | undefined) ?? [];
    // For compound SKUs like "KUMXB181A / 2-KNMAB071A", parse the parts
    const skuParts: Array<{ sku: string; quantity: number }> = [];

    if (sku.includes(" / ")) {
      for (const part of sku.split(" / ")) {
        const trimmed = part.trim();
        // Handle quantity prefix like "2-KNMAB071A" or "3-KNMAB071A"
        const qtyMatch = trimmed.match(/^(\d+)-(.+)$/);
        if (qtyMatch) {
          skuParts.push({ sku: qtyMatch[2], quantity: parseInt(qtyMatch[1], 10) });
        } else {
          skuParts.push({ sku: trimmed, quantity: 1 });
        }
      }
    } else if (allSkus.length > 1) {
      // Use all_skus field — first SKU is the system itself, rest are components
      for (const s of allSkus) {
        if (s === sku) continue;
        const qtyMatch = s.match(/^(\d+)-(.+)$/);
        if (qtyMatch) {
          skuParts.push({ sku: qtyMatch[2], quantity: parseInt(qtyMatch[1], 10) });
        } else {
          skuParts.push({ sku: s, quantity: 1 });
        }
      }
    }

    // Look up each component product
    for (const part of skuParts) {
      const { data: comp } = await supabase
        .from("products")
        .select("id, sku, title, thumbnail_url, specs")
        .eq("sku", part.sku)
        .eq("is_active", true)
        .maybeSingle();

      if (comp) {
        const compSpecs = (comp.specs ?? {}) as Record<string, unknown>;
        const eqType = (compSpecs.equipment_type as string) ?? "";
        let role = "component";
        if (eqType.includes("outdoor")) role = "outdoor-unit";
        else if (eqType.includes("indoor")) role = "indoor-unit";
        else if (comp.title.includes("ODU") || comp.title.toLowerCase().includes("outdoor")) role = "outdoor-unit";
        else if (comp.title.includes("IDU") || comp.title.toLowerCase().includes("indoor")) role = "indoor-unit";

        componentProducts.push({
          id: comp.id,
          sku: comp.sku,
          title: comp.title,
          thumbnailUrl: comp.thumbnail_url,
          role,
          quantity: part.quantity,
        });
      }
    }
  }

  const retail = (pricing ?? []).find((row) => {
    const t = Array.isArray(row.pricing_tiers) ? row.pricing_tiers[0] : row.pricing_tiers;
    return t?.name === "Retail";
  });
  const price = retail?.total_price ?? null;
  const msrp = retail?.msrp ?? null;
  const savings = calculateSavings(msrp, price);

  const gallery = (images ?? []).length > 0
    ? images!.map((i) => ({ url: i.url, alt: i.alt_text ?? product.title }))
    : product.thumbnail_url
      ? [{ url: product.thumbnail_url, alt: product.title }]
      : [];

  const primaryImage = gallery[0];

  // Clean and deduplicate specs for display
  const specEntries = cleanSpecEntries(specs);

  // Extract key AHRI specs for a highlight bar on system products
  const ahriNumber = specs["AHRI Certificate Number"] as string | undefined;
  const seer2 = specs.seer2 ?? specs["SEER2 (Efficiency)"];
  const hspf2 = specs.HSPF2;

  return (
    <div className="container py-8">
      <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
        <Link href={isCompleteSystem ? "/catalog?product_category=complete-systems" : "/catalog"} className="hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> {isCompleteSystem ? "Systems" : "Catalog"}
        </Link>
        {category && !isCompleteSystem && (
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
            ) : isCompleteSystem ? (
              <Layers className="h-24 w-24 text-muted-foreground/30" />
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
            {isCompleteSystem ? `${product.brand} System Package` : product.brand}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2">{product.title}</h1>
          <div className="text-sm text-muted-foreground mb-4 font-mono">
            SKU {product.sku}
            {product.model_number && product.model_number !== product.sku && (
              <> &middot; Model {product.model_number}</>
            )}
            {ahriNumber && (
              <> &middot; AHRI #{ahriNumber}</>
            )}
          </div>

          {/* AHRI performance highlights for systems */}
          {isCompleteSystem && (seer2 || hspf2) && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {seer2 && (
                <div className="px-3 py-1.5 bg-primary/10 rounded-md text-sm">
                  <span className="font-semibold text-primary">SEER2</span>{" "}
                  <span className="font-bold">{String(seer2)}</span>
                </div>
              )}
              {hspf2 && (
                <div className="px-3 py-1.5 bg-primary/10 rounded-md text-sm">
                  <span className="font-semibold text-primary">HSPF2</span>{" "}
                  <span className="font-bold">{String(hspf2)}</span>
                </div>
              )}
              {specs.energy_star === "yes" && (
                <div className="px-3 py-1.5 bg-green-50 dark:bg-green-950/30 rounded-md text-sm text-green-700 dark:text-green-400 font-semibold">
                  Energy Star
                </div>
              )}
              {specs.cold_climate === "yes" && (
                <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-md text-sm text-blue-700 dark:text-blue-400 font-semibold">
                  Cold Climate
                </div>
              )}
            </div>
          )}

          <div className="border-y py-4 mb-4">
            {/* List Price strikethrough */}
            {savings && (
              <div className="text-sm text-muted-foreground line-through mb-1">
                List Price {formatPrice(msrp)}
              </div>
            )}
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

          {/* Included Components — shown for complete-systems with resolved components */}
          {componentProducts.length > 0 && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Included Components ({componentProducts.length})
              </h2>
              <div className="space-y-2">
                {componentProducts.map((comp) => (
                  <div key={comp.sku} className="flex items-center gap-3 p-2 border rounded-md bg-card">
                    <div className="flex-shrink-0 h-10 w-10 rounded bg-muted/30 flex items-center justify-center overflow-hidden">
                      {comp.thumbnailUrl ? (
                        <Image
                          src={comp.thumbnailUrl}
                          alt={comp.title}
                          width={40}
                          height={40}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {comp.quantity > 1 && (
                          <span className="text-primary font-semibold">{comp.quantity}&times; </span>
                        )}
                        <Link
                          href={`/product/${encodeURIComponent(comp.sku)}`}
                          className="hover:text-primary hover:underline"
                        >
                          {comp.title}
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {comp.sku}
                        {comp.role !== "component" && (
                          <> &middot; <span className="capitalize">{comp.role.replace(/-/g, " ")}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accessories Section — only shown for equipment products with compatible accessories */}
      {accessoryGroups.length > 0 && (
        <AccessorySelector groups={accessoryGroups} />
      )}

      {/* Tabbed content section */}
      <ProductTabs
        description={product.description}
        specEntries={specEntries}
        docs={docs ?? []}
      />
    </div>
  );
}
