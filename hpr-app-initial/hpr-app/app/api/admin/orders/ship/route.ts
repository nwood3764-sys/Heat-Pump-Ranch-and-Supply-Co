import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/microsoft-graph";
import { buildShippingConfirmationEmail } from "@/lib/emails/shipping-confirmation";

/**
 * POST /api/admin/orders/ship
 *
 * Mark an order as shipped, save tracking info, and send the customer
 * a shipping confirmation email with tracking link and magic links.
 *
 * Body: {
 *   stripeSessionId: string;
 *   trackingNumber: string;
 *   carrier: string; // "UPS", "FedEx", "USPS", "Freight", etc.
 * }
 */
export async function POST(request: NextRequest) {
  // Verify admin auth
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session_valid");
  if (session?.value !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { stripeSessionId, trackingNumber, carrier } = body;

    if (!stripeSessionId || !trackingNumber || !carrier) {
      return NextResponse.json(
        { error: "stripeSessionId, trackingNumber, and carrier are required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Fetch the order
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_session_id", stripeSessionId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order status to shipped
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        tracking_number: trackingNumber,
        carrier,
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", stripeSessionId);

    if (updateError) {
      console.error("[Ship Order] Failed to update order:", updateError);
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    // Send shipping confirmation email to customer
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heat-pump-ranch-and-supply-co.netlify.app";

    const { subject, htmlBody } = buildShippingConfirmationEmail({
      orderId: order.order_id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      items: order.items as any[],
      shippingAddress: order.shipping_address as any,
      trackingNumber,
      carrier,
      orderToken: order.order_token,
      siteUrl,
    });

    try {
      await sendEmail({
        to: [order.customer_email],
        subject,
        htmlBody,
      });
      console.log(`[Ship Order] Shipping confirmation sent to ${order.customer_email}`);
    } catch (emailErr: any) {
      console.error("[Ship Order] Failed to send shipping email:", emailErr);
      // Don't fail the request — order is already marked shipped
    }

    // Also notify the store owner
    try {
      await sendEmail({
        to: ["orders@heatpumpranch.com"],
        subject: `Shipped: Order #${order.order_id} — ${carrier} ${trackingNumber}`,
        htmlBody: `<p>Order <strong>#${order.order_id}</strong> has been marked as shipped.</p>
          <p>Customer: ${order.customer_name} (${order.customer_email})</p>
          <p>Carrier: ${carrier}</p>
          <p>Tracking: ${trackingNumber}</p>`,
      });
    } catch (_) {
      // Non-critical
    }

    return NextResponse.json({ success: true, status: "shipped" });
  } catch (err: any) {
    console.error("[Ship Order] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
