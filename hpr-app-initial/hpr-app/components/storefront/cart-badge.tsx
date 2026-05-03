"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/storefront/cart-provider";

export function CartBadge() {
  const { cart, setCartOpen } = useCart();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => setCartOpen(true)}
      aria-label={`My Project — ${cart.itemCount} items`}
    >
      <ShoppingCart className="h-5 w-5" />
      {cart.itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {cart.itemCount > 99 ? "99+" : cart.itemCount}
        </span>
      )}
    </Button>
  );
}
