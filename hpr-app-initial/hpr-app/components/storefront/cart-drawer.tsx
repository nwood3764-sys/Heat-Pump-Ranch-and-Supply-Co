"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/storefront/cart-provider";
import { formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const { cart, isCartOpen, setCartOpen, updateQuantity, removeItem, isLoading } = useCart();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">
            My Project
            {cart.itemCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
              </span>
            )}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCartOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-lg font-medium text-muted-foreground">Your project is empty</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Add equipment and systems to get started.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setCartOpen(false)}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.items.map((item) => (
                <li key={item.cartItemId} className="flex gap-3 rounded-lg border p-3">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.title}
                        fill
                        className="object-contain p-1"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col">
                    <Link
                      href={item.href}
                      className="text-sm font-medium leading-tight hover:underline line-clamp-2"
                      onClick={() => setCartOpen(false)}
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.brand} &middot; {item.sku}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isLoading}
                          onClick={() =>
                            item.quantity <= 1
                              ? removeItem(item.cartItemId)
                              : updateQuantity(item.cartItemId, item.quantity - 1)
                          }
                        >
                          {item.quantity <= 1 ? (
                            <Trash2 className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isLoading}
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Line total */}
                      <span className="text-sm font-semibold">
                        {formatPrice(item.lineTotal)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <div className="border-t px-4 py-4">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pay by bank (ACH) at no extra charge, or credit card + processing fee at checkout.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/project" onClick={() => setCartOpen(false)}>
                <Button className="w-full" size="lg">
                  View My Project
                </Button>
              </Link>
              <Link href="/checkout" onClick={() => setCartOpen(false)}>
                <Button variant="outline" className="w-full" size="lg">
                  Proceed to Checkout
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
