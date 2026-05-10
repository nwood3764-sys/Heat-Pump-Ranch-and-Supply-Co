import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/contractor-application
 *
 * Submits a contractor application. The user must be authenticated.
 * Inserts a row into contractor_accounts with status='pending'.
 *
 * Body: {
 *   company_name: string (required)
 *   contact_name: string (required)
 *   phone: string (required)
 *   address: string
 *   city: string
 *   state: string
 *   zip: string
 *   license_number: string
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const sc = createServiceClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to apply for a contractor account." },
      { status: 401 },
    );
  }

  // Resolve internal app user
  const { data: appUser } = await sc
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!appUser) {
    return NextResponse.json(
      { error: "User account not found. Please contact support." },
      { status: 404 },
    );
  }

  // Check for existing application
  const { data: existing } = await sc
    .from("contractor_accounts")
    .select("id, status")
    .eq("user_id", appUser.id)
    .single();

  if (existing) {
    const statusMsg =
      existing.status === "pending"
        ? "Your contractor application is already under review. We'll notify you once it's approved."
        : existing.status === "approved"
          ? "You already have an approved contractor account."
          : "Your contractor account has been suspended. Please contact support.";
    return NextResponse.json({ error: statusMsg }, { status: 409 });
  }

  // Parse and validate body
  const body = await request.json();
  const { company_name, contact_name, phone, address, city, state, zip, license_number } = body;

  if (!company_name || typeof company_name !== "string" || company_name.trim().length === 0) {
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 },
    );
  }

  if (!contact_name || typeof contact_name !== "string" || contact_name.trim().length === 0) {
    return NextResponse.json(
      { error: "Contact name is required." },
      { status: 400 },
    );
  }

  if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
    return NextResponse.json(
      { error: "Phone number is required." },
      { status: 400 },
    );
  }

  // Insert contractor application
  const { data: application, error } = await sc
    .from("contractor_accounts")
    .insert({
      user_id: appUser.id,
      company_name: company_name.trim(),
      contact_name: contact_name.trim(),
      phone: phone.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      zip: zip?.trim() || null,
      license_number: license_number?.trim() || null,
      status: "pending",
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    console.error("[contractor-application] Insert failed:", error);
    return NextResponse.json(
      { error: "Failed to submit application. Please try again or contact support." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Application submitted successfully. We'll review it and get back to you within 1-2 business days.",
    application,
  });
}
