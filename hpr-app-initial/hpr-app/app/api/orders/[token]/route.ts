import { NextResponse } from "next/server";
import { getOrderByToken } from "@/lib/order-tokens";

/**
 * GET /api/orders/[token]
 *
 * Fetch order details by secure token (for customer-facing magic link pages).
 * Returns a sanitized view of the order (no internal IDs, no stripe session).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 20) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const order = await getOrderByToken(token);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Return sanitized order data (no internal IDs or stripe details)
  return NextResponse.json({
    order_id: order.order_id,
    status: order.status,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    payment_method: order.payment_method,
    amount_total_cents: order.amount_total_cents,
    items: order.items,
    shipping_address: order.shipping_address,
    tracking_number: order.tracking_number,
    carrier: order.carrier,
    shipped_at: order.shipped_at,
    created_at: order.created_at,
  });
}
