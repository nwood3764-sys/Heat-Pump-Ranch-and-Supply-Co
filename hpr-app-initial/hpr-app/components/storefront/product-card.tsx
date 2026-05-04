import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { AddToProjectButton } from "@/components/storefront/add-to-project-button";
import type { PricingEntity } from "@/lib/supabase/types";

export interface ProductCardData {
  id: number;
  sku: string;
  brand: string;
  title: string;
  thumbnailUrl: string | null;
  href: string;
  /** Our selling price (dealer cost x 1.30) */
  price: number | string | null;
  /** List price (kept for data but no longer displayed) */
  msrp: number | string | null;
  /** Entity type for cart operations */
  entityType?: PricingEntity;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const entityType = p.entityType ?? (p.href.startsWith("/system") ? "system" : "product");

  return (
    <Card className="group relative overflow-hidden flex flex-col h-full transition-shadow hover:shadow-md">
      <Link href={p.href} className="block">
        <div className="aspect-square bg-muted/30 flex items-center justify-center p-6 border-b">
          {p.thumbnailUrl ? (
            <Image
              src={p.thumbnailUrl}
              alt={p.title}
              width={300}
              height={300}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Package className="h-16 w-16 text-muted-foreground/30" />
          )}
        </div>
      </Link>

      <CardContent className="p-4 flex flex-col flex-1">
        <Link href={p.href} className="block mb-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {p.brand}
          </div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-3 group-hover:text-primary">
            {p.title}
          </h3>
          <div className="text-xs text-muted-foreground mt-1 font-mono">{p.sku}</div>
        </Link>

        <div className="mt-auto">
          {/* Our price */}
          {p.price ? (
            <div className="font-bold text-lg text-green-700">
              {formatPrice(p.price)}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Call for pricing</div>
          )}

          <div className="flex gap-2 mt-3">
            {p.price ? (
              <AddToProjectButton
                entityType={entityType}
                entityId={p.id}
                size="sm"
                className="flex-1"
              />
            ) : (
              <Button size="sm" className="flex-1" disabled>
                Call for Pricing
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
