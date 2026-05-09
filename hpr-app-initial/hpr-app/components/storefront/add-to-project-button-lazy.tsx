"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ShoppingCart } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { PricingEntity } from "@/lib/supabase/types";

// Dynamically import the full AddToProjectButton only when the user interacts.
// This avoids hydrating 24 complex button instances on catalog page initial load.
const AddToProjectButtonFull = dynamic(
  () => import("@/components/storefront/add-to-project-button").then((m) => ({ default: m.AddToProjectButton })),
  { ssr: false }
);

interface Props extends Omit<ButtonProps, "onClick"> {
  entityType: PricingEntity;
  entityId: number;
  quantity?: number;
}

export function AddToProjectButtonLazy({
  entityType,
  entityId,
  quantity = 1,
  className,
  size = "default",
  ...props
}: Props) {
  const [activated, setActivated] = useState(false);

  if (activated) {
    return (
      <AddToProjectButtonFull
        entityType={entityType}
        entityId={entityId}
        quantity={quantity}
        className={className}
        size={size}
        {...props}
      />
    );
  }

  return (
    <Button
      onClick={() => setActivated(true)}
      className={className}
      size={size}
      {...props}
    >
      <ShoppingCart className="h-4 w-4" />
      Add to My Project
    </Button>
  );
}
