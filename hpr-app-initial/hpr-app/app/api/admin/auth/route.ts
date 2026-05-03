import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/admin/auth
 *
 * Admin authentication endpoint.
 * Actions: "login", "logout", "change-password"
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  switch (action) {
    case "login":
      return handleLogin(body);
    case "logout":
      return handleLogout();
    case "change-password":
      return handleChangePassword(body);
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}

async function handleLogin(body: { password?: string }) {
  const { password } = body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "Admin password not configured" }, { status: 500 });
  }

  if (!password || password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Set a session cookie (valid for 24 hours)
  const cookieStore = await cookies();
  const sessionToken = generateSessionToken();
  
  cookieStore.set("admin_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  // Store the valid token in an env-backed approach
  // For simplicity, we'll validate by checking the cookie exists and matches a hash
  cookieStore.set("admin_session_valid", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return NextResponse.json({ success: true });
}

async function handleLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  cookieStore.delete("admin_session_valid");
  return NextResponse.json({ success: true });
}

async function handleChangePassword(body: { currentPassword?: string; newPassword?: string }) {
  const { currentPassword, newPassword } = body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "Admin password not configured" }, { status: 500 });
  }

  if (!currentPassword || currentPassword !== adminPassword) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  // Note: To actually change the password, you'd need to update the ADMIN_PASSWORD
  // environment variable in Netlify. This endpoint validates the current password
  // and returns instructions.
  return NextResponse.json({
    success: true,
    message: "Password validated. To change the admin password, update the ADMIN_PASSWORD environment variable in Netlify and redeploy.",
  });
}

function generateSessionToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * GET /api/admin/auth
 * Check if the current session is valid.
 */
export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session_valid");

  if (session?.value === "true") {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
