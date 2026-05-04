import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface RoleRow {
  role: string;
}

/**
 * Performance-optimized middleware:
 * - Public storefront routes skip the auth check entirely (no Supabase call)
 * - Only /admin routes (which need protection) perform auth verification
 * - API routes that need auth handle it themselves in the route handler
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fast path: public storefront pages and API routes don't need middleware auth.
  // The cart/checkout APIs handle their own auth internally.
  const isAdminRoute = pathname.startsWith("/admin");
  if (!isAdminRoute) {
    return NextResponse.next();
  }

  // Admin routes: full auth check required
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session if expired, syncs cookies.
  const { data: { user } } = await supabase.auth.getUser();

  // Protect /admin routes (exclude /admin/orders which has its own auth)
  if (!pathname.startsWith("/admin/orders")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("auth_id", user.id)
      .single();
    const profile = (data ?? null) as RoleRow | null;
    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
