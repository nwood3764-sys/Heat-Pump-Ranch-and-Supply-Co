import { UtilityBar } from "@/components/storefront/utility-bar";
import { SiteHeader } from "@/components/storefront/site-header";
import { MainNav } from "@/components/storefront/main-nav";
import { SiteFooter } from "@/components/storefront/site-footer";
import { CartProvider } from "@/components/storefront/cart-provider";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { ChatWidget } from "@/components/storefront/chat-widget";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <UtilityBar />
      <SiteHeader />
      <MainNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <ChatWidget />
    </CartProvider>
  );
}
