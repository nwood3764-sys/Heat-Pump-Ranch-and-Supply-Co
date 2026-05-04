import { NextResponse, type NextRequest } from "next/server";
import { sendEmail } from "@/lib/microsoft-graph";

/**
 * Custom signup endpoint that:
 * 1. Creates the user via Supabase Admin API
 * 2. Generates a confirmation link
 * 3. Sends the confirmation email through Microsoft Graph (heatpumpranch.com domain)
 *
 * This bypasses Supabase's built-in email sending so all emails come from our domain.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, company, role } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[Signup] Missing env vars:", {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey,
      });
      return NextResponse.json(
        { error: "Server configuration error. Please contact support." },
        { status: 500 }
      );
    }

    const adminHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    // Step 1: Generate a signup link (creates user + returns confirmation link)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://heatpumpranch.com";

    console.log("[Signup] Creating user:", email);

    const generateResp = await fetch(
      `${supabaseUrl}/auth/v1/admin/generate_link`,
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          type: "signup",
          email,
          password,
          data: { name, company: company || undefined, role: role || undefined },
          redirect_to: `${siteUrl}/api/auth/callback`,
        }),
      }
    );

    if (!generateResp.ok) {
      const errData = await generateResp.json().catch(() => ({}));
      const errMsg =
        errData?.msg || errData?.message || errData?.error || "Signup failed.";

      console.error("[Signup] Generate link failed:", generateResp.status, errData);

      // Handle duplicate user
      if (
        generateResp.status === 422 ||
        errMsg.toLowerCase().includes("already registered") ||
        errMsg.toLowerCase().includes("already been registered") ||
        errMsg.toLowerCase().includes("duplicate")
      ) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const linkData = await generateResp.json();
    const confirmationLink = linkData.action_link;

    if (!confirmationLink) {
      console.error("[Signup] No action_link in response:", linkData);
      return NextResponse.json(
        { error: "Account created but confirmation link generation failed. Please contact support." },
        { status: 500 }
      );
    }

    // Replace the default redirect with our site URL
    const finalLink = confirmationLink.replace(
      /redirect_to=[^&]*/,
      `redirect_to=${encodeURIComponent(`${siteUrl}/api/auth/callback`)}`
    );

    console.log("[Signup] User created, sending confirmation email to:", email);

    // Step 2: Send confirmation email via Microsoft Graph
    const firstName = name.split(" ")[0];

    try {
      await sendEmail({
        to: [email],
        subject: "Confirm Your Account — The Heat Pump Ranch & Supply Co.",
        htmlBody: buildConfirmationEmail(firstName, finalLink),
      });
      console.log("[Signup] Confirmation email sent successfully to:", email);
    } catch (emailErr: unknown) {
      // User was created but email failed — log it and still return success
      // so the user knows to check their email (we can resend later)
      console.error("[Signup] Email sending failed:", emailErr);
      
      // Still return success — the user was created. They can request a resend.
      return NextResponse.json({
        success: true,
        emailWarning: "Account created but confirmation email may be delayed.",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Signup] Unexpected error:", errorMessage);
    return NextResponse.json(
      { error: `Signup failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

function buildConfirmationEmail(firstName: string, confirmLink: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 0;">
      <div style="background: #1e3a5f; padding: 24px 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">
          The Heat Pump Ranch & Supply Co.
        </h1>
      </div>

      <div style="padding: 32px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1e3a5f; margin: 0 0 16px 0; font-size: 22px;">
          Welcome, ${firstName}!
        </h2>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
          Thanks for creating your account. Click the button below to confirm your
          email address and get access to contractor pricing, order tracking, and
          equipment specialist support.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${confirmLink}"
             style="display: inline-block; background: #1e3a5f; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 6px;">
            Confirm My Account
          </a>
        </div>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 8px 0;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #6b7280; font-size: 12px; word-break: break-all; margin: 0 0 24px 0;">
          ${confirmLink}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
          Questions? Reply to this email or call us at
          <a href="tel:+16088309224" style="color: #1e3a5f;">608-830-9224</a>.
        </p>
      </div>

      <div style="padding: 16px 32px; background: #f9fafb; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          The Heat Pump Ranch & Supply Co. · HVAC Equipment &amp; Supplies<br/>
          You received this because someone signed up with this email address.
          If that wasn't you, ignore this email.
        </p>
      </div>
    </div>
  `;
}
