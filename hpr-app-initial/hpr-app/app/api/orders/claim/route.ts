import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { linkAllOrdersToUser } from "@/lib/order-tokens";

/**
 * POST /api/orders/claim
 *
 * Links all orders for a given email to the currently authenticated user.
 * Called after a guest creates an account to claim their past orders.
 *
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    // Verify the email matches the authenticated user
    if (user.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "Email mismatch" }, { status: 403 });
    }

    // Get the app user ID
    const serviceClient = createServiceClient();
    const { data: appUser } = await serviceClient
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Link all unclaimed orders for this email
    const claimed = await linkAllOrdersToUser(email, appUser.id);

    return NextResponse.json({ success: true, claimed });
  } catch (err: any) {
    console.error("[Claim Orders] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
