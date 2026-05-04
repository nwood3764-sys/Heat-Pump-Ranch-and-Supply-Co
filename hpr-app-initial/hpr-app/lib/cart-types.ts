import type { PricingEntity } from "@/lib/supabase/types";

/**
 * A hydrated cart line item with product/system details and pricing.
 * This is the shape returned by the cart API and consumed by the UI.
 */
export interface CartLineItem {
  cartItemId: number;
  entityType: PricingEntity;
  entityId: number;
  sku: string;
  title: string;
  brand: string;
  thumbnailUrl: string | null;
  href: string;
  unitPrice: number;
  msrp: number | null;
  quantity: number;
  lineTotal: number;
  /** Project this item is assigned to (null for unassigned/guest items) */
  projectId: number | null;
}

/**
 * Full cart response from the API.
 */
export interface CartResponse {
  cartId: number | null;
  items: CartLineItem[];
  subtotal: number;
  itemCount: number;
}

/**
 * Payload for adding an item to the cart.
 */
export interface AddToCartPayload {
  entityType: PricingEntity;
  entityId: number;
  quantity?: number;
  /** Optional project ID to assign this item to */
  projectId?: number | null;
}

/**
 * Payload for updating a cart item quantity.
 */
export interface UpdateCartItemPayload {
  cartItemId: number;
  quantity: number;
}

/**
 * A user project for organizing equipment.
 */
export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: "active" | "archived" | "checked_out";
  itemCount: number;
  created_at: string;
  updated_at: string;
}

/**
 * Payload for moving an item to a different project.
 */
export interface MoveToProjectPayload {
  cartItemId: number;
  projectId: number | null;
}
