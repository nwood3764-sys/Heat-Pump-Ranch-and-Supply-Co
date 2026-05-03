import Link from "next/link";
import { User } from "lucide-react";
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

        {/* Universal search with live autocomplete */}
        <SearchAutocomplete />

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
