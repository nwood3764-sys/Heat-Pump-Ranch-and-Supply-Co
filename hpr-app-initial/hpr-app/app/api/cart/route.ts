import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { CartLineItem, CartResponse } from "@/lib/cart-types";

const CART_SESSION_COOKIE = "hpr_cart_session";

/**
 * Resolve or create a cart for the current user/session.
 * - Authenticated users get a cart tied to their user_id.
 * - Guests get a cart tied to a session_id cookie.
 */
async function resolveCart(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serviceClient: ReturnType<typeof createServiceClient>,
  request: NextRequest,
  createIfMissing = false,
): Promise<{ cartId: number | null; sessionId: string | null; isNew: boolean }> {
  // Check for authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let appUserId: number | null = null;
  if (user) {
    const { data: appUser } = await serviceClient
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();
    appUserId = appUser?.id ?? null;
  }

  // Try to find existing cart
  if (appUserId) {
    const { data: cart } = await serviceClient
      .from("carts")
      .select("id")
      .eq("user_id", appUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cart) return { cartId: cart.id, sessionId: null, isNew: false };

    if (createIfMissing) {
      const { data: newCart, error } = await serviceClient
        .from("carts")
        .insert({ user_id: appUserId })
        .select("id")
        .single();
      if (error) console.error("[cart] Failed to create user cart:", error);
      return { cartId: newCart?.id ?? null, sessionId: null, isNew: true };
    }

    return { cartId: null, sessionId: null, isNew: false };
  }

  // Guest cart via session cookie
  const sessionId = request.cookies.get(CART_SESSION_COOKIE)?.value ?? null;

  if (sessionId) {
    const { data: cart } = await serviceClient
      .from("carts")
      .select("id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cart) return { cartId: cart.id, sessionId, isNew: false };
  }

  if (createIfMissing) {
    const newSessionId = sessionId ?? crypto.randomUUID();
    const { data: newCart, error } = await serviceClient
      .from("carts")
      .insert({ session_id: newSessionId })
      .select("id")
      .single();
    if (error) console.error("[cart] Failed to create guest cart:", error);
    return { cartId: newCart?.id ?? null, sessionId: newSessionId, isNew: true };
  }

  return { cartId: null, sessionId, isNew: false };
}

/**
 * Hydrate cart items with product/system details and pricing.
 */
async function hydrateCartItems(
  supabase: ReturnType<typeof createServiceClient>,
  cartId: number,
): Promise<CartLineItem[]> {
  const { data: items } = await supabase
    .from("cart_items")
    .select("id, entity_type, entity_id, quantity")
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });

  if (!items || items.length === 0) return [];

  const productIds = items.filter((i) => i.entity_type === "product").map((i) => i.entity_id);
  const systemIds = items.filter((i) => i.entity_type === "system").map((i) => i.entity_id);

  // Run ALL detail + pricing queries in PARALLEL for maximum speed
  const productMap = new Map<number, { sku: string; brand: string; title: string; thumbnail_url: string | null }>();
  const systemMap = new Map<number, { system_sku: string; title: string; thumbnail_url: string | null; ahri_number: string | null }>();
  const pricingMap = new Map<string, { price: number; msrp: number | null }>();

  const parallelQueries: Array<Promise<void> | PromiseLike<void>> = [];

  if (productIds.length > 0) {
    parallelQueries.push(
      supabase
        .from("products")
        .select("id, sku, brand, title, thumbnail_url")
        .in("id", productIds)
        .then(({ data: products }) => {
          for (const p of products ?? []) productMap.set(p.id, p);
        })
    );
    parallelQueries.push(
      supabase
        .from("product_pricing")
        .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
        .eq("entity_type", "product")
        .in("entity_id", productIds)
        .then(({ data: pricing }) => {
          if (pricing) {
            for (const row of pricing as Array<{
              entity_id: number;
              total_price: string;
              msrp: string | null;
              pricing_tiers: { name: string } | { name: string }[];
            }>) {
              const tierName = Array.isArray(row.pricing_tiers)
                ? row.pricing_tiers[0]?.name
                : row.pricing_tiers?.name;
              if (tierName === "Retail") {
                pricingMap.set(`product-${row.entity_id}`, {
                  price: parseFloat(row.total_price),
                  msrp: row.msrp ? parseFloat(row.msrp) : null,
                });
              }
            }
          }
        })
    );
  }

  if (systemIds.length > 0) {
    parallelQueries.push(
      supabase
        .from("system_packages")
        .select("id, system_sku, title, thumbnail_url, ahri_number")
        .in("id", systemIds)
        .then(({ data: systems }) => {
          for (const s of systems ?? []) systemMap.set(s.id, s);
        })
    );
    parallelQueries.push(
      supabase
        .from("product_pricing")
        .select("entity_id, total_price, msrp, pricing_tiers!inner(name)")
        .eq("entity_type", "system")
        .in("entity_id", systemIds)
        .then(({ data: pricing }) => {
          if (pricing) {
            for (const row of pricing as Array<{
              entity_id: number;
              total_price: string;
              msrp: string | null;
              pricing_tiers: { name: string } | { name: string }[];
            }>) {
              const tierName = Array.isArray(row.pricing_tiers)
                ? row.pricing_tiers[0]?.name
                : row.pricing_tiers?.name;
              if (tierName === "Retail") {
                pricingMap.set(`system-${row.entity_id}`, {
                  price: parseFloat(row.total_price),
                  msrp: row.msrp ? parseFloat(row.msrp) : null,
                });
              }
            }
          }
        })
    );
  }

  await Promise.all(parallelQueries);

  // Build line items
  const lineItems: CartLineItem[] = [];

  for (const item of items) {
    const pr = pricingMap.get(`${item.entity_type}-${item.entity_id}`);
    if (!pr) continue; // Skip items without pricing

    let sku = "";
    let title = "";
    let brand = "";
    let thumbnailUrl: string | null = null;
    let href = "";

    if (item.entity_type === "product") {
      const p = productMap.get(item.entity_id);
      if (!p) continue;
      sku = p.sku;
      title = p.title;
      brand = p.brand;
      thumbnailUrl = p.thumbnail_url;
      href = `/product/${encodeURIComponent(p.sku)}`;
    } else {
      const s = systemMap.get(item.entity_id);
      if (!s) continue;
      sku = s.system_sku;
      title = s.title;
      brand = s.ahri_number ? `AHRI #${s.ahri_number}` : "System";
      thumbnailUrl = s.thumbnail_url;
      href = `/system/${encodeURIComponent(s.system_sku)}`;
    }

    lineItems.push({
      cartItemId: item.id,
      entityType: item.entity_type,
      entityId: item.entity_id,
      sku,
      title,
      brand,
      thumbnailUrl,
      href,
      unitPrice: pr.price,
      msrp: pr.msrp,
      quantity: item.quantity,
      lineTotal: pr.price * item.quantity,
    });
  }

  return lineItems;
}

/**
 * GET /api/cart — Retrieve the current cart with hydrated line items.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const sc = createServiceClient();
  const { cartId } = await resolveCart(supabase, sc, request);

  if (!cartId) {
    return NextResponse.json({
      cartId: null,
      items: [],
      subtotal: 0,
      itemCount: 0,
    } satisfies CartResponse);
  }

  const items = await hydrateCartItems(sc, cartId);
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return NextResponse.json({
    cartId,
    items,
    subtotal,
    itemCount,
  } satisfies CartResponse);
}

/**
 * POST /api/cart — Add an item to the cart.
 * Body: { entityType: "product" | "system", entityId: number, quantity?: number }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { entityType, entityId, quantity = 1 } = body;

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const sc = createServiceClient();
  const { cartId, sessionId, isNew } = await resolveCart(supabase, sc, request, true);

  if (!cartId) {
    return NextResponse.json({ error: "Failed to create cart" }, { status: 500 });
  }

  // Check if item already exists in cart — if so, increment quantity
  const { data: existing } = await sc
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();

  if (existing) {
    await sc
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id);
  } else {
    const { error: insertError } = await sc.from("cart_items").insert({
      cart_id: cartId,
      entity_type: entityType,
      entity_id: entityId,
      quantity,
    });
    if (insertError) console.error("[cart] Failed to insert cart item:", insertError);
  }

  // Hydrate and return updated cart
  const items = await hydrateCartItems(sc, cartId);
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const response = NextResponse.json({
    cartId,
    items,
    subtotal,
    itemCount,
  } satisfies CartResponse);

  // Set session cookie for guest carts
  if (sessionId) {
    response.cookies.set(CART_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  return response;
}

/**
 * PATCH /api/cart — Update a cart item quantity.
 * Body: { cartItemId: number, quantity: number }
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { cartItemId, quantity } = body;

  if (!cartItemId || quantity === undefined) {
    return NextResponse.json({ error: "cartItemId and quantity are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const sc = createServiceClient();
  const { cartId } = await resolveCart(supabase, sc, request);

  if (!cartId) {
    return NextResponse.json({ error: "No cart found" }, { status: 404 });
  }

  if (quantity <= 0) {
    // Remove the item
    await sc.from("cart_items").delete().eq("id", cartItemId).eq("cart_id", cartId);
  } else {
    await sc
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId)
      .eq("cart_id", cartId);
  }

  const items = await hydrateCartItems(sc, cartId);
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return NextResponse.json({
    cartId,
    items,
    subtotal,
    itemCount,
  } satisfies CartResponse);
}

/**
 * DELETE /api/cart — Remove a specific item from the cart.
 * Query: ?cartItemId=123
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cartItemId = searchParams.get("cartItemId");

  if (!cartItemId) {
    return NextResponse.json({ error: "cartItemId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const sc = createServiceClient();
  const { cartId } = await resolveCart(supabase, sc, request);

  if (!cartId) {
    return NextResponse.json({ error: "No cart found" }, { status: 404 });
  }

  await sc
    .from("cart_items")
    .delete()
    .eq("id", parseInt(cartItemId))
    .eq("cart_id", cartId);

  const items = await hydrateCartItems(sc, cartId);
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return NextResponse.json({
    cartId,
    items,
    subtotal,
    itemCount,
  } satisfies CartResponse);
}
