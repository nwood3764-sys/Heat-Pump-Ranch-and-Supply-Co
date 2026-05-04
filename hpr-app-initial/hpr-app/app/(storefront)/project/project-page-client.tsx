"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/components/storefront/cart-provider";
import { formatPrice } from "@/lib/utils";

export function ProjectPageClient() {
  const { cart, updateQuantity, removeItem, isLoading, refreshCart } = useCart();

  // Ensure cart data is loaded when visiting this page directly
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <div className="container py-8">
      <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2">
        <Link href="/catalog" className="hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Continue Shopping
        </Link>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold mb-6">My Project</h1>

      {cart.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingCart className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-xl font-medium text-muted-foreground">Your project is empty</p>
          <p className="mt-2 text-sm text-muted-foreground/70 max-w-md">
            Browse our catalog and add equipment, systems, and accessories to build your project.
          </p>
          <Link href="/catalog" className="mt-6">
            <Button size="lg">Browse Catalog</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Line items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <Card key={item.cartItemId}>
                <CardContent className="p-4 flex gap-4">
                  {/* Thumbnail */}
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted border">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.title}
                        fill
                        className="object-contain p-1"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col min-w-0">
                    <Link
                      href={item.href}
                      className="font-semibold text-sm leading-tight hover:text-primary hover:underline line-clamp-2"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.brand} &middot; SKU: {item.sku}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatPrice(item.unitPrice)} each
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isLoading}
                          onClick={() =>
                            item.quantity <= 1
                              ? removeItem(item.cartItemId)
                              : updateQuantity(item.cartItemId, item.quantity - 1)
                          }
                        >
                          {item.quantity <= 1 ? (
                            <Trash2 className="h-3.5 w-3.5" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <span className="w-10 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isLoading}
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 text-destructive hover:text-destructive"
                          disabled={isLoading}
                          onClick={() => removeItem(item.cartItemId)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      </div>

                      {/* Line total */}
                      <span className="text-base font-bold">
                        {formatPrice(item.lineTotal)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order summary sidebar */}
          <div>
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Project Summary</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Items ({cart.itemCount})
                    </span>
                    <span>{formatPrice(cart.subtotal)}</span>
                  </div>
                </div>

                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between text-base font-bold">
                    <span>Subtotal</span>
                    <span>{formatPrice(cart.subtotal)}</span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Pay by bank (ACH) at no extra charge. Credit card payments include a processing fee (2.9% + $0.30).
                </p>

                <Link href="/checkout" className="block mt-4">
                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                  </Button>
                </Link>

                <Link href="/catalog" className="block mt-2">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
