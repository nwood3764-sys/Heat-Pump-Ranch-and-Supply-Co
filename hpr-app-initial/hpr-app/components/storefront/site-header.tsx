import { Suspense } from "react";
import Link from "next/link";
import { User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchAutocomplete } from "@/components/storefront/search-autocomplete";
import { CartBadge } from "@/components/storefront/cart-badge";
import { AccountButton } from "@/components/storefront/account-button";
import { MobileMenu } from "@/components/storefront/mobile-menu";

export function SiteHeader() {
  return (
    <header className="bg-background border-b sticky top-0 z-40">
      <div className="container flex items-center gap-4 md:gap-6 h-14 md:h-16">
        {/* Mobile menu toggle */}
        <div className="md:hidden">
          <MobileMenu />
        </div>

        {/* Logo */}
        <Link href="/" className="font-bold text-base md:text-lg tracking-tight whitespace-nowrap">
          <span className="hidden sm:inline">The Heat Pump Ranch</span>
          <span className="sm:hidden">HPR</span>
          <span className="hidden md:inline text-muted-foreground font-normal"> & Supply Co.</span>
        </Link>

        {/* Desktop search */}
        <Suspense fallback={
          <div className="relative flex-1 max-w-2xl hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder="Search by SKU, model, or keyword…"
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm shadow-sm placeholder:text-muted-foreground"
                disabled
              />
            </div>
          </div>
        }>
          <SearchAutocomplete />
        </Suspense>

        {/* Right side actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Suspense fallback={
            <Link href="/login">
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">Account</span>
              </Button>
            </Link>
          }>
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
