import { Suspense } from "react";
import Link from "next/link";
import { Search, ShoppingCart, UserPlus } from "lucide-react";
import { SearchAutocomplete } from "@/components/storefront/search-autocomplete";
import { CartBadge } from "@/components/storefront/cart-badge";
import { AccountButton } from "@/components/storefront/account-button";
import { MobileMenu } from "@/components/storefront/mobile-menu";

export function SiteHeader() {
  return (
    <header className="bg-background border-b sticky top-0 z-40">
      <div className="container flex items-center gap-4 md:gap-6 h-16 md:h-20">
        {/* Mobile menu toggle */}
        <div className="md:hidden">
          <MobileMenu />
        </div>

        {/* Logo */}
        <Link href="/" className="font-bold text-lg md:text-xl tracking-tight whitespace-nowrap flex-shrink-0">
          <span className="hidden sm:inline">The Heat Pump Ranch</span>
          <span className="sm:hidden">HPR</span>
          <span className="hidden md:inline text-muted-foreground font-normal text-base"> & Supply Co.</span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Quick action links - desktop only */}
        <div className="hidden lg:flex items-center gap-6 text-sm">
          <Link href="/signup" className="flex flex-col items-center gap-0.5 hover:text-primary transition-colors">
            <UserPlus className="h-5 w-5" />
            <span className="text-xs font-medium">New Customer</span>
          </Link>
          <Link href="/catalog" className="flex flex-col items-center gap-0.5 hover:text-primary transition-colors">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs font-medium">Online Store</span>
          </Link>
        </div>

        {/* Search bar */}
        <div className="hidden md:block w-64 lg:w-80">
          <Suspense fallback={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder="Search..."
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm shadow-sm placeholder:text-muted-foreground"
                disabled
              />
            </div>
          }>
            <SearchAutocomplete />
          </Suspense>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 md:gap-2">
          <Suspense fallback={null}>
            <AccountButton />
          </Suspense>
          <CartBadge />
        </div>
      </div>

      {/* Mobile search bar — below header on small screens */}
      <div className="md:hidden border-t px-4 py-2">
        <Suspense fallback={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search products…"
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm shadow-sm placeholder:text-muted-foreground"
              disabled
            />
          </div>
        }>
          <SearchAutocomplete />
        </Suspense>
      </div>
    </header>
  );
}
