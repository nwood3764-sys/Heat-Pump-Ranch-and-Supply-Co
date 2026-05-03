import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler. Listens for checkout.session.completed events
 * to confirm payment and trigger order fulfillment.
 *
 * Setup:
 * 1. Create a webhook endpoint in Stripe Dashboard pointing to:
 *    https://yourdomain.com/api/webhooks/stripe
 * 2. Set the STRIPE_WEBHOOK_SECRET environment variable.
 * 3. Subscribe to: checkout.session.completed, checkout.session.async_payment_succeeded
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const cartId = session.metadata?.cart_id;
      const paymentMethod = session.metadata?.payment_method;

      console.log(
        `[Stripe Webhook] Payment completed for cart ${cartId} via ${paymentMethod}`,
        {
          sessionId: session.id,
          amountTotal: session.amount_total,
          paymentStatus: session.payment_status,
          customerEmail: session.customer_details?.email,
        },
      );

      // For ACH payments, the payment_status may be "unpaid" initially
      // because ACH takes a few days to settle. The actual payment
      // confirmation comes via checkout.session.async_payment_succeeded.
      if (session.payment_status === "paid") {
        // TODO: Create order record, send confirmation email, clear cart
        console.log(`[Stripe Webhook] Order ready for fulfillment — cart ${cartId}`);
      }
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      // ACH payments confirm asynchronously (2-4 business days)
      const session = event.data.object as Stripe.Checkout.Session;
      const cartId = session.metadata?.cart_id;

      console.log(
        `[Stripe Webhook] ACH payment succeeded for cart ${cartId}`,
        {
          sessionId: session.id,
          amountTotal: session.amount_total,
        },
      );

      // TODO: Mark order as paid, trigger fulfillment
      break;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const cartId = session.metadata?.cart_id;

      console.log(
        `[Stripe Webhook] ACH payment FAILED for cart ${cartId}`,
        {
          sessionId: session.id,
        },
      );

      // TODO: Mark order as failed, notify customer
      break;
    }

    default:
      // Unhandled event type — log and acknowledge
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
