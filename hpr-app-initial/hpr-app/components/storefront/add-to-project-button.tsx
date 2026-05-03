"use client";

import { useState } from "react";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCart } from "@/components/storefront/cart-provider";
import type { PricingEntity } from "@/lib/supabase/types";

interface AddToProjectButtonProps extends Omit<ButtonProps, "onClick"> {
  entityType: PricingEntity;
  entityId: number;
  quantity?: number;
}

export function AddToProjectButton({
  entityType,
  entityId,
  quantity = 1,
  className,
  size = "default",
  ...props
}: AddToProjectButtonProps) {
  const { addToCart, isLoading: cartLoading } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleClick = async () => {
    if (isAdding || justAdded) return;
    setIsAdding(true);
    try {
      await addToCart({ entityType, entityId, quantity });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isAdding || cartLoading}
      className={className}
      size={size}
      {...props}
    >
      {isAdding ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Adding...
        </>
      ) : justAdded ? (
        <>
          <Check className="h-4 w-4" />
          Added to Project
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          Add to My Project
        </>
      )}
    </Button>
  );
}
