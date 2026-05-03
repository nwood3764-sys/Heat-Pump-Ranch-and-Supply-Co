import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, calculateSavings } from "@/lib/utils";
import { SystemTabs } from "./system-tabs";
import { AddToProjectButton } from "@/components/storefront/add-to-project-button";

// 5-minute ISR: system detail pages rarely change mid-day.
export const revalidate = 300;

export default async function SystemPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku: rawSku } = await params;
  const sku = decodeURIComponent(rawSku);
  const supabase = await createClient();

  // system_packages.system_sku is citext, so case-insensitive match is automatic.
  const { data: system } = await supabase
    .from("system_packages")
    .select("id, system_sku, title, description, ahri_number, specs, thumbnail_url")
    .eq("system_sku", sku)
    .eq("is_active", true)
    .maybeSingle();

  if (!system) notFound();

  // Fetch components, pricing, and AHRI cert in parallel
  const [{ data: components }, { data: pricing }] = await Promise.all([
    supabase
      .from("system_components")
      .select("id, quantity, role, products(id, sku, brand, title, thumbnail_url)")
      .eq("system_id", system.id),
    supabase
      .from("product_pricing")
      .select("total_price, msrp, pricing_tiers!inner(name)")
      .eq("entity_type", "system")
      .eq("entity_id", system.id),
  ]);

  // Get retail pricing
  const retail = (pricing ?? []).find((row: any) => {
    const t = Array.isArray(row.pricing_tiers) ? row.pricing_tiers[0] : row.pricing_tiers;
    return t?.name === "Retail";
  });
  const price = retail?.total_price ?? null;
  const msrp = retail?.msrp ?? null;
  const savings = calculateSavings(msrp, price);

  // Use the first component's thumbnail as fallback if system has no thumbnail
  const systemImage = system.thumbnail_url
    ?? (components ?? []).find((c: any) => c.products?.thumbnail_url)?.products?.thumbnail_url
    ?? null;

  // Specs: filter out internal bookkeeping fields
  const specEntries = Object.entries((system.specs ?? {}) as Record<string, unknown>)
    .filter(([k, v]) => {
      if (k === "all_skus" || k === "hvacdirect_breadcrumbs" || k === "source_origin") return false;
      if (v === null || v === undefined) return false;
      if (typeof v === "object") return false;
      return true;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  // Format components for display
  const componentList = (components ?? []).map((c: any) => ({
    id: c.id,
    quantity: c.quantity,
    role: c.role,
    sku: c.products?.sku ?? "Unknown",
    brand: c.products?.brand ?? "Unknown",
    title: c.products?.title ?? "Unknown Component",
    thumbnailUrl: c.products?.thumbnail_url ?? null,
    productId: c.products?.id ?? null,
  }));

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
        <Link href="/catalog?type=systems" className="hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> System Packages
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div>
          <div className="aspect-square border rounded-md bg-muted/20 flex items-center justify-center p-8 overflow-hidden">
            {systemImage ? (
              <Image
                src={systemImage}
                alt={system.title}
                width={600}
                height={600}
                className="max-h-full max-w-full object-contain"
                priority
              />
            ) : (
              <Layers className="h-24 w-24 text-muted-foreground/30" />
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            System Package
          </div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2">{system.title}</h1>
          <div className="text-sm text-muted-foreground mb-4 font-mono">
            SKU {system.system_sku}
            {system.ahri_number && (
              <> &middot; AHRI #{system.ahri_number}</>
            )}
          </div>

          {/* Pricing */}
          <div className="border-y py-4 mb-4">
            {savings && (
              <Badge variant="savings" className="mb-2">
                SAVE {formatPrice(savings.amount)} ({savings.percent}%)
              </Badge>
            )}
            {/* List price — strikethrough (only show if list > our price) */}
            {savings && msrp && (
              <div className="text-sm text-muted-foreground">
                <span className="line-through">List Price: {formatPrice(msrp)}</span>
              </div>
            )}
            {/* Our price (sum of component dealer costs × 1.30) */}
            {price ? (
              <div className="text-3xl font-bold text-green-700">{formatPrice(price)}</div>
            ) : (
              <div className="text-lg text-muted-foreground">Call for pricing</div>
            )}
            {price && (
              <div className="text-xs text-muted-foreground mt-1">
                Contractor pricing available with approved account
              </div>
            )}
          </div>

          <div className="flex gap-2 mb-6">
            {price ? (
              <AddToProjectButton
                entityType="system"
                entityId={system.id}
                size="lg"
                className="flex-1"
              />
            ) : (
              <Button size="lg" className="flex-1" disabled>
                Call for Pricing
              </Button>
            )}
          </div>

          {/* Component summary */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Included Components ({componentList.length})
            </h2>
            <div className="space-y-2">
              {componentList.map((comp) => (
                <div key={comp.id} className="flex items-center gap-3 p-2 border rounded-md bg-card">
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
                        <span className="text-primary font-semibold">{comp.quantity}× </span>
                      )}
                      {comp.productId ? (
                        <Link
                          href={`/product/${encodeURIComponent(comp.sku)}`}
                          className="hover:text-primary hover:underline"
                        >
                          {comp.title}
                        </Link>
                      ) : (
                        comp.title
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {comp.sku}
                      {comp.role && comp.role !== "unknown" && (
                        <> &middot; <span className="capitalize">{comp.role.replace(/_/g, " ")}</span></>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed content section */}
      <SystemTabs
        description={system.description}
        specEntries={specEntries}
      />
    </div>
  );
}
