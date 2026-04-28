import { UtilityBar } from "@/components/storefront/utility-bar";
import { SiteHeader } from "@/components/storefront/site-header";
import { CategoryNav } from "@/components/storefront/category-nav";
import { SiteFooter } from "@/components/storefront/site-footer";

// Storefront pages query Supabase per-request (catalog, product detail).
// Disable static prerendering so the build doesn't try to fetch live data
// at build time. Pages still get aggressively cached at the CDN edge.
export const dynamic = "force-dynamic";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UtilityBar />
      <SiteHeader />
      <CategoryNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
