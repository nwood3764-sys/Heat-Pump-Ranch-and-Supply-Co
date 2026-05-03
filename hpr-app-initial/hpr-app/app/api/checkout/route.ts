import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe, calculateCCSurcharge } from "@/lib/stripe";

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session for the current cart.
 *
 * Body: {
 *   paymentMethod: "card" | "ach"
 * }
 *
 * For "card" payments, a credit card processing fee (2.9% + $0.30) is added
 * as a separate line item. For "ach" payments, no surcharge is applied.
 *
 * Returns: { url: string } — the Stripe Checkout URL to redirect to.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentMethod, cartId: clientCartId } = body;

    if (!paymentMethod || !["card", "ach"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "paymentMethod must be 'card' or 'ach'" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const stripe = getStripe();

    // Resolve the cart — use service client for DB reads (bypasses RLS)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("[checkout] user:", user?.id ?? "guest");

    let appUserId: number | null = null;
    if (user) {
      const { data: appUser } = await serviceClient
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      appUserId = appUser?.id ?? null;
    }

    // Find the cart
    let cartId: number | null = null;
    if (appUserId) {
      const { data: cart } = await serviceClient
        .from("carts")
        .select("id")
        .eq("user_id", appUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      cartId = cart?.id ?? null;
    } else {
      const sessionId = request.cookies.get("hpr_cart_session")?.value;
      console.log("[checkout] sessionId from cookie:", sessionId ?? "NONE");
      console.log("[checkout] all cookies:", request.cookies.getAll().map(c => c.name));
      if (sessionId) {
        const { data: cart } = await serviceClient
          .from("carts")
          .select("id")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        cartId = cart?.id ?? null;
      }
    }

    // Fallback: use cartId from client if cookie-based resolution failed
    if (!cartId && clientCartId) {
      // Verify the cart exists in the database before trusting the client value
      const { data: verifiedCart } = await serviceClient
        .from("carts")
        .select("id")
        .eq("id", clientCartId)
        .single();
      if (verifiedCart) {
        cartId = verifiedCart.id;
        console.log("[checkout] Resolved cart via client fallback:", cartId);
      }
    }

    if (!cartId) {
      console.error("[checkout] No cart found for user/session or client fallback");
      return NextResponse.json({ error: "No cart found" }, { status: 404 });
    }

    // Fetch cart items
    const { data: items } = await serviceClient
      .from("cart_items")
      .select("id, entity_type, entity_id, quantity")
      .eq("cart_id", cartId);

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Fetch product/system details and pricing
    const productIds = items.filter((i) => i.entity_type === "product").map((i) => i.entity_id);
    const systemIds = items.filter((i) => i.entity_type === "system").map((i) => i.entity_id);

    const productMap = new Map<number, { sku: string; title: string; brand: string }>();
    if (productIds.length > 0) {
      const { data: products } = await serviceClient
        .from("products")
        .select("id, sku, title, brand")
        .in("id", productIds);
      for (const p of products ?? []) productMap.set(p.id, p);
    }

    const systemMap = new Map<number, { system_sku: string; title: string }>();
    if (systemIds.length > 0) {
      const { data: systems } = await serviceClient
        .from("system_packages")
        .select("id, system_sku, title")
        .in("id", systemIds);
      for (const s of systems ?? []) systemMap.set(s.id, s);
    }

    // Fetch Retail pricing
    const pricingMap = new Map<string, number>();
    for (const entityType of ["product", "system"] as const) {
      const ids = entityType === "product" ? productIds : systemIds;
      if (ids.length === 0) continue;

      const { data: pricing } = await serviceClient
        .from("product_pricing")
        .select("entity_id, total_price, pricing_tiers!inner(name)")
        .eq("entity_type", entityType)
        .in("entity_id", ids);

      if (pricing) {
        for (const row of pricing as Array<{
          entity_id: number;
          total_price: string;
          pricing_tiers: { name: string } | { name: string }[];
        }>) {
          const tierName = Array.isArray(row.pricing_tiers)
            ? row.pricing_tiers[0]?.name
            : row.pricing_tiers?.name;
          if (tierName === "Retail") {
            pricingMap.set(`${entityType}-${row.entity_id}`, parseFloat(row.total_price));
          }
        }
      }
    }

    // Build Stripe line items
    const lineItems: Array<{
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }> = [];

    let subtotal = 0;

    for (const item of items) {
      const price = pricingMap.get(`${item.entity_type}-${item.entity_id}`);
      if (!price) continue;

      let name = "";
      let description = "";

      if (item.entity_type === "product") {
        const p = productMap.get(item.entity_id);
        if (!p) continue;
        name = p.title;
        description = `${p.brand} | SKU: ${p.sku}`;
      } else {
        const s = systemMap.get(item.entity_id);
        if (!s) continue;
        name = s.title;
        description = `System SKU: ${s.system_sku}`;
      }

      const unitAmountCents = Math.round(price * 100);
      subtotal += price * item.quantity;

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name, description },
          unit_amount: unitAmountCents,
        },
        quantity: item.quantity,
      });
    }

    // Add credit card surcharge line item if paying by card
    if (paymentMethod === "card") {
      const surcharge = calculateCCSurcharge(subtotal);
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Credit Card Processing Fee",
            description: "2.9% + $0.30 processing fee for credit card payments",
          },
          unit_amount: Math.round(surcharge * 100),
        },
        quantity: 1,
      });
    }

    // Determine allowed payment method types
    const paymentMethodTypes =
      paymentMethod === "ach" ? ["us_bank_account" as const] : ["card" as const];

    // Build the Stripe Checkout Session
    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      line_items: lineItems,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/project`,
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      metadata: {
        cart_id: cartId.toString(),
        payment_method: paymentMethod,
      },
      ...(paymentMethod === "ach"
        ? {
            payment_method_options: {
              us_bank_account: {
                financial_connections: { permissions: ["payment_method" as const] },
              },
            },
          }
        : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[checkout] Error creating Stripe session:", err);
    const message = err?.message ?? "Failed to create checkout session";
    const stripeCode = err?.code ?? err?.type ?? "unknown";
    return NextResponse.json(
      { error: message, code: stripeCode, detail: err?.raw?.message ?? null },
      { status: 500 },
    );
  }
}
