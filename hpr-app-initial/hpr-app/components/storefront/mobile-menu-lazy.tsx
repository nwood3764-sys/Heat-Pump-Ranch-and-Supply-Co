"use client";

import dynamic from "next/dynamic";
import { Menu } from "lucide-react";

// Lazy-load the mobile menu — it's only needed on interaction (tap hamburger).
// The trigger button renders immediately; the heavy slide-out panel loads on demand.
const MobileMenuInner = dynamic(
  () => import("@/components/storefront/mobile-menu").then((m) => ({ default: m.MobileMenu })),
  {
    ssr: false,
    loading: () => (
      <button className="p-2 text-slate-600" aria-label="Menu">
        <Menu className="h-5 w-5" />
      </button>
    ),
  }
);

export function MobileMenuLazy() {
  return <MobileMenuInner />;
}
