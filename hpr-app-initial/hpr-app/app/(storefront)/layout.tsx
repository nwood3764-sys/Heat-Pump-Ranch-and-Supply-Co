import { UtilityBar } from "@/components/storefront/utility-bar";
import { SiteHeader } from "@/components/storefront/site-header";
import { CategoryNav } from "@/components/storefront/category-nav";
import { SiteFooter } from "@/components/storefront/site-footer";

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
