/**
 * Order management utilities.
 *
 * Orders are stored in the `orders` table in Supabase.
 * This module provides helpers for creating, updating, and querying orders.
 */

import { createServiceClient } from "@/lib/supabase/server";

export interface OrderItem {
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unit_price_cents: number;
}

export interface ShippingAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface Order {
  id?: number;
  order_id: string; // human-readable order ID like "HPR-20260503-001"
  stripe_session_id: string;
  customer_email: string;
  customer_name: string;
  payment_method: "card" | "ach";
  amount_total_cents: number;
  status: "paid" | "pending" | "failed" | "shipped" | "cancelled";
  items: OrderItem[];
  shipping_address?: ShippingAddress;
  tracking_number?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Generate a human-readable order ID.
 * Format: HPR-YYYYMMDD-XXX (where XXX is a sequential number for the day)
 */
export function generateOrderId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 900) + 100; // 3-digit random
  return `HPR-${dateStr}-${random}`;
}

/**
 * Save a new order to the database.
 */
export async function createOrder(order: Omit<Order, "id" | "created_at" | "updated_at">): Promise<Order> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_id: order.order_id,
      stripe_session_id: order.stripe_session_id,
      customer_email: order.customer_email,
      customer_name: order.customer_name,
      payment_method: order.payment_method,
      amount_total_cents: order.amount_total_cents,
      status: order.status,
      items: order.items as any,
      shipping_address: order.shipping_address as any,
      tracking_number: order.tracking_number ?? null,
      notes: order.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[Orders] Failed to create order:", error);
    throw new Error(`Failed to create order: ${error.message}`);
  }

  console.log(`[Orders] Created order ${order.order_id}`);
  return data as unknown as Order;
}

/**
 * Update an existing order's status.
 */
export async function updateOrderStatus(
  stripeSessionId: string,
  status: Order["status"],
  additionalFields?: Partial<Pick<Order, "tracking_number" | "notes">>,
): Promise<void> {
  const supabase = createServiceClient();

  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
    ...additionalFields,
  };

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("stripe_session_id", stripeSessionId);

  if (error) {
    console.error("[Orders] Failed to update order:", error);
    throw new Error(`Failed to update order: ${error.message}`);
  }

  console.log(`[Orders] Updated order for session ${stripeSessionId} to status: ${status}`);
}

/**
 * Get all orders, sorted by most recent first.
 */
export async function getOrders(limit = 100, offset = 0): Promise<Order[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[Orders] Failed to fetch orders:", error);
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return (data ?? []) as unknown as Order[];
}

/**
 * Get a single order by its order_id.
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  return data as unknown as Order;
}
