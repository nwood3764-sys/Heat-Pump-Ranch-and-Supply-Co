import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/microsoft-graph";

/**
 * TEMPORARY diagnostic endpoint — tests Microsoft Graph email sending.
 * DELETE THIS after debugging.
 * 
 * GET /api/auth/test-email?to=your@email.com
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to");

  if (!to) {
    return NextResponse.json({ error: "Add ?to=your@email.com" }, { status: 400 });
  }

  // Check env vars
  const envCheck = {
    hasAzureTenantId: !!process.env.AZURE_TENANT_ID,
    hasAzureClientId: !!process.env.AZURE_CLIENT_ID,
    hasAzureClientSecret: !!process.env.AZURE_CLIENT_SECRET,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  try {
    await sendEmail({
      to: [to],
      subject: "HPR Email Test — It Works!",
      htmlBody: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Email Test Successful</h2>
          <p>If you're reading this, Microsoft Graph email sending is working correctly from the signup API route.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Test email sent to ${to}`,
      envCheck 
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      stack: errorStack,
      envCheck 
    }, { status: 500 });
  }
}
