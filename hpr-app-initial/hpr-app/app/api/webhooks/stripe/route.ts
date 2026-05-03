import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { sendOrderNotification } from "@/lib/microsoft-graph";
import { createOrder, updateOrderStatus, generateOrderId } from "@/lib/orders";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler. Listens for checkout session events
 * to confirm payment, create order records, and send email notifications.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleAsyncPaymentSucceeded(session);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleAsyncPaymentFailed(session);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
    // Still return 200 to prevent Stripe from retrying indefinitely
    // The error is logged for debugging
  }

  return NextResponse.json({ received: true });
}

/**
 * Handle checkout.session.completed event.
 *
 * For card payments: payment_status = "paid" → create order + send notification
 * For ACH payments: payment_status = "unpaid" → create order as "pending"
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripe = getStripe();
  const cartId = session.metadata?.cart_id;
  const paymentMethod = (session.metadata?.payment_method ?? "card") as "card" | "ach";

  console.log(`[Stripe Webhook] checkout.session.completed — cart ${cartId}, payment_status: ${session.payment_status}`);

  // Retrieve line items from the session
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });

  const items = lineItems.data
    .filter((item) => item.description !== "Credit Card Processing Fee")
    .map((item) => ({
      name: item.description ?? "Unknown Item",
      description: item.description ?? undefined,
      quantity: item.quantity ?? 1,
      unit_price_cents: item.price?.unit_amount ?? 0,
    }));

  // Extract shipping address
  const shippingDetails = session.shipping_details ?? session.customer_details;
  const shippingAddress = shippingDetails?.address
    ? {
        name: shippingDetails.name ?? session.customer_details?.name ?? undefined,
        line1: shippingDetails.address.line1 ?? undefined,
        line2: shippingDetails.address.line2 ?? undefined,
        city: shippingDetails.address.city ?? undefined,
        state: shippingDetails.address.state ?? undefined,
        postal_code: shippingDetails.address.postal_code ?? undefined,
        country: shippingDetails.address.country ?? undefined,
      }
    : undefined;

  const status = session.payment_status === "paid" ? "paid" : "pending";
  const orderId = generateOrderId();

  // Create order record in database
  try {
    await createOrder({
      order_id: orderId,
      stripe_session_id: session.id,
      customer_email: session.customer_details?.email ?? "unknown@email.com",
      customer_name: session.customer_details?.name ?? "Unknown Customer",
      payment_method: paymentMethod,
      amount_total_cents: session.amount_total ?? 0,
      status,
      items,
      shipping_address: shippingAddress,
    });
  } catch (err: any) {
    console.error("[Stripe Webhook] Failed to create order record:", err);
    // Continue to send email even if DB write fails
  }

  // Send email notification
  try {
    await sendOrderNotification({
      orderId,
      sessionId: session.id,
      customerEmail: session.customer_details?.email ?? "unknown@email.com",
      customerName: session.customer_details?.name ?? "Unknown Customer",
      paymentMethod,
      amountTotal: session.amount_total ?? 0,
      items,
      shippingAddress,
      status,
    });
  } catch (err: any) {
    console.error("[Stripe Webhook] Failed to send order notification email:", err);
  }
}

/**
 * Handle ACH payment success (2-4 business days after checkout).
 */
async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
  console.log(`[Stripe Webhook] ACH payment succeeded for session ${session.id}`);

  try {
    await updateOrderStatus(session.id, "paid");
  } catch (err: any) {
    console.error("[Stripe Webhook] Failed to update order status:", err);
  }

  // Send a follow-up notification that ACH payment cleared
  try {
    const stripe = getStripe();
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });

    const items = lineItems.data
      .map((item) => ({
        name: item.description ?? "Unknown Item",
        quantity: item.quantity ?? 1,
        unit_price_cents: item.price?.unit_amount ?? 0,
      }));

    await sendOrderNotification({
      orderId: `ACH-CONFIRMED-${session.id.slice(-8)}`,
      sessionId: session.id,
      customerEmail: session.customer_details?.email ?? "unknown@email.com",
      customerName: session.customer_details?.name ?? "Unknown Customer",
      paymentMethod: "ach",
      amountTotal: session.amount_total ?? 0,
      items,
      status: "paid",
    });
  } catch (err: any) {
    console.error("[Stripe Webhook] Failed to send ACH confirmation email:", err);
  }
}

/**
 * Handle ACH payment failure.
 */
async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  console.log(`[Stripe Webhook] ACH payment FAILED for session ${session.id}`);

  try {
    await updateOrderStatus(session.id, "failed");
  } catch (err: any) {
    console.error("[Stripe Webhook] Failed to update order status:", err);
  }

  // Send failure notification
  try {
    await sendOrderNotification({
      orderId: `FAILED-${session.id.slice(-8)}`,
      sessionId: session.id,
      customerEmail: session.customer_details?.email ?? "unknown@email.com",
      customerName: session.customer_details?.name ?? "Unknown Customer",
      paymentMethod: "ach",
      amountTotal: session.amount_total ?? 0,
      items: [],
      status: "failed",
    });
  } catch (err: any) {
    console.error("[Stripe Webhook] Failed to send failure notification email:", err);
  }
}
