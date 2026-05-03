import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getOrders, updateOrderStatus } from "@/lib/orders";

/**
 * Verify admin session before processing requests.
 */
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session_valid");
  return session?.value === "true";
}

/**
 * GET /api/admin/orders
 * Fetch all orders (requires admin auth).
 */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await getOrders(200);
    return NextResponse.json({ orders });
  } catch (err: any) {
    console.error("[Admin Orders] Error fetching orders:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/orders
 * Update an order's status or tracking info (requires admin auth).
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { stripeSessionId, status, trackingNumber, notes } = body;

    if (!stripeSessionId || !status) {
      return NextResponse.json({ error: "stripeSessionId and status are required" }, { status: 400 });
    }

    const validStatuses = ["paid", "pending", "failed", "shipped", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    await updateOrderStatus(stripeSessionId, status, {
      tracking_number: trackingNumber,
      notes,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Admin Orders] Error updating order:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
