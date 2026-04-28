import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, calculateSavings } from "@/lib/utils";

export interface ProductCardData {
  id: number;
  sku: string;
  brand: string;
  title: string;
  thumbnailUrl: string | null;
  href: string;
  price: number | string | null;
  msrp: number | string | null;
  reviewCount?: number;
  reviewScore?: number; // 0..1
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const savings = calculateSavings(p.msrp, p.price);

  return (
    <Card className="group relative overflow-hidden flex flex-col h-full transition-shadow hover:shadow-md">
      {savings && (
        <Badge variant="savings" className="absolute top-2 left-2 z-10">
          SAVE {formatPrice(savings.amount)}
        </Badge>
      )}

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

        <div className="text-xs text-muted-foreground mb-2">
          {p.reviewCount ? (
            <span>★ {(p.reviewScore ?? 0) * 5} &middot; {p.reviewCount} reviews</span>
          ) : (
            <span className="italic">Be the first to review</span>
          )}
        </div>

        <div className="mt-auto">
          {p.msrp && p.price && (
            <div className="text-xs text-muted-foreground line-through">
              Was {formatPrice(p.msrp)}
            </div>
          )}
          {p.price ? (
            <div className="font-bold text-lg text-foreground">
              {formatPrice(p.price)}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Call for pricing</div>
          )}

          <div className="flex gap-2 mt-3">
            <Button size="sm" className="flex-1">Add to Cart</Button>
            <Button size="sm" variant="outline">Compare</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
