import { Suspense } from "react";
import Link from "next/link";
import { User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchAutocomplete } from "@/components/storefront/search-autocomplete";
import { CartBadge } from "@/components/storefront/cart-badge";

export function SiteHeader() {
  return (
    <header className="bg-background border-b sticky top-0 z-40">
      <div className="container flex items-center gap-6 h-16">
        <Link href="/" className="font-bold text-lg tracking-tight whitespace-nowrap">
          The Heat Pump Ranch
          <span className="hidden md:inline text-muted-foreground font-normal"> & Supply Co.</span>
        </Link>

        {/* Universal search with live autocomplete — wrapped in Suspense
            because SearchAutocomplete uses useSearchParams() */}
        <Suspense fallback={
          <div className="relative flex-1 max-w-2xl hidden sm:block">
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

        <div className="flex items-center gap-1 ml-auto">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden lg:inline">Account</span>
            </Button>
          </Link>
          <CartBadge />
        </div>
      </div>
    </header>
  );
}
