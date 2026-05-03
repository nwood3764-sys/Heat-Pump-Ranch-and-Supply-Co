import { UtilityBar } from "@/components/storefront/utility-bar";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { CartProvider } from "@/components/storefront/cart-provider";
import { CartDrawer } from "@/components/storefront/cart-drawer";

// Storefront pages query Supabase per-request (catalog, product detail).
// Disable static prerendering so the build doesn't try to fetch live data
// at build time. Pages still get aggressively cached at the CDN edge.
export const dynamic = "force-dynamic";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <UtilityBar />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
    </CartProvider>
  );
}
