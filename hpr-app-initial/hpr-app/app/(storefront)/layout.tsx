import { UtilityBar } from "@/components/storefront/utility-bar";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { CartProvider } from "@/components/storefront/cart-provider";
import { CartDrawer } from "@/components/storefront/cart-drawer";

// REMOVED: export const dynamic = "force-dynamic";
//
// Previously this disabled all caching for the entire storefront, forcing
// every page navigation to be a full server round-trip. Now individual pages
// control their own caching via `revalidate` (ISR) which allows the CDN edge
// to serve cached pages and make navigation feel instant.
//
// Pages that need fresh data per-request (e.g. checkout) can set their own
// `dynamic = "force-dynamic"` locally.

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
