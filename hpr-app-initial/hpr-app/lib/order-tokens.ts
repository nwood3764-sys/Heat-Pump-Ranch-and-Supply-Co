/**
 * Order Token System
 *
 * Generates and validates secure tokens for magic-link order access.
 * Tokens are URL-safe, unique, and stored in the orders table.
 *
 * Used for:
 * - View Order Status (no login required)
 * - Request Return / Report Damage
 * - Create Account (guest-to-account flow)
 */

import { randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Generate a cryptographically secure, URL-safe token.
 * Format: 32 bytes = 43 characters base64url (no padding)
 */
export function generateOrderToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Look up an order by its secure token.
 * Returns the full order record or null if not found.
 */
export async function getOrderByToken(token: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_token", token)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Look up all orders for a given email address.
 * Used for the guest-to-account flow to claim past orders.
 */
export async function getOrdersByEmail(email: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_email", email.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

/**
 * Link an order to a user account (used after guest creates account).
 */
export async function linkOrderToUser(orderId: string, userId: number): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("orders")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("order_id", orderId);

  if (error) {
    console.error("[OrderTokens] Failed to link order to user:", error);
    return false;
  }
  return true;
}

/**
 * Link all orders for an email to a user account.
 * Called when a guest creates an account — claims all past orders.
 */
export async function linkAllOrdersToUser(email: string, userId: number): Promise<number> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("customer_email", email.toLowerCase())
    .is("user_id", null)
    .select("id");

  if (error) {
    console.error("[OrderTokens] Failed to link orders to user:", error);
    return 0;
  }
  return data?.length ?? 0;
}
