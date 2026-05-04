"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Package, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/storefront/cart-provider";
import { formatPrice } from "@/lib/utils";
import type { AccessoryGroup } from "@/lib/accessories";

interface AccessorySelectorProps {
  groups: AccessoryGroup[];
}

/**
 * "Choose Your Accessories" section — HVACDirect-style dropdown selectors
 * grouped by category with thumbnail images and price additions.
 *
 * Each category shows a dropdown where the user can select an accessory.
 * Selected accessories are tracked in local state and added to cart
 * via the "Add Selected Accessories" button.
 */
export function AccessorySelector({ groups }: AccessorySelectorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selections, setSelections] = useState<Record<string, number | null>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { addToCart } = useCart();

  if (!groups || groups.length === 0) return null;

  const handleSelect = (groupLabel: string, productId: number | null) => {
    setSelections((prev) => ({ ...prev, [groupLabel]: productId }));
    setJustAdded(false);
  };

  const selectedItems = Object.entries(selections)
    .filter(([, id]) => id !== null)
    .map(([label, id]) => {
      const group = groups.find((g) => g.label === label);
      const item = group?.items.find((i) => i.id === id);
      return item;
    })
    .filter(Boolean);

  const totalAccessoryPrice = selectedItems.reduce(
    (sum, item) => sum + (item?.price ?? 0),
    0,
  );

  const handleAddAccessories = async () => {
    if (selectedItems.length === 0) return;
    setIsAdding(true);
    try {
      // Add each selected accessory to cart sequentially
      for (const item of selectedItems) {
        if (item) {
          await addToCart({
            entityType: "product",
            entityId: item.id,
            quantity: 1,
          });
        }
      }
      setJustAdded(true);
    } catch (err) {
      console.error("Failed to add accessories:", err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="mt-8 border rounded-lg overflow-hidden">
      {/* Header bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3 bg-blue-600 text-white font-semibold text-sm uppercase tracking-wide hover:bg-blue-700 transition-colors"
      >
        <span>Choose Your Accessories</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="p-5 bg-card">
          {/* Category grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((group) => (
              <AccessoryCategoryRow
                key={group.label}
                group={group}
                selectedId={selections[group.label] ?? null}
                onSelect={(id) => handleSelect(group.label, id)}
              />
            ))}
          </div>

          {/* Summary & Add button */}
          {selectedItems.length > 0 && (
            <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selectedItems.length} accessor{selectedItems.length === 1 ? "y" : "ies"} selected
                </span>
                {totalAccessoryPrice > 0 && (
                  <span className="ml-2">
                    — Total: <span className="font-semibold text-green-700">{formatPrice(totalAccessoryPrice)}</span>
                  </span>
                )}
              </div>
              <button
                onClick={handleAddAccessories}
                disabled={isAdding || justAdded}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                {isAdding
                  ? "Adding..."
                  : justAdded
                    ? "Added to Project!"
                    : "Add Selected Accessories"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Individual category row with thumbnail + dropdown
// ---------------------------------------------------------------

interface AccessoryCategoryRowProps {
  group: AccessoryGroup;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

function AccessoryCategoryRow({
  group,
  selectedId,
  onSelect,
}: AccessoryCategoryRowProps) {
  // Use the first item's thumbnail as the category image, or the selected item's
  const selectedItem = group.items.find((i) => i.id === selectedId);
  const displayImage =
    selectedItem?.thumbnailUrl ?? group.items[0]?.thumbnailUrl ?? null;

  return (
    <div className="flex items-start gap-3">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-16 h-16 rounded border bg-muted/20 flex items-center justify-center overflow-hidden">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={group.label}
            width={64}
            height={64}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Package className="h-8 w-8 text-muted-foreground/30" />
        )}
      </div>

      {/* Label + Dropdown */}
      <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-foreground mb-1">
          {group.label}
        </label>
        <select
          value={selectedId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onSelect(val ? Number(val) : null);
          }}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Choose a selection...</option>
          {group.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
              {item.price ? ` +${formatPrice(item.price)}` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
