import { UtilityBar } from "@/components/storefront/utility-bar";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { ChatWidget } from "@/components/storefront/chat-widget";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UtilityBar />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
