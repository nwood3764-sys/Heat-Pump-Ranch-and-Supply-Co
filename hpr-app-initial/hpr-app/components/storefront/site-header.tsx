import Link from "next/link";
import { Search, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SiteHeader() {
  return (
    <header className="bg-background border-b sticky top-0 z-40">
      <div className="container flex items-center gap-6 h-16">
        <Link href="/" className="font-bold text-lg tracking-tight whitespace-nowrap">
          The Heat Pump Ranch
          <span className="hidden md:inline text-muted-foreground font-normal"> & Supply Co.</span>
        </Link>

        <form action="/catalog" className="flex-1 max-w-2xl hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search by SKU, model, or category…"
              className="pl-9"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 ml-auto">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden lg:inline">Account</span>
            </Button>
          </Link>
          <Link href="/cart">
            <Button variant="ghost" size="sm" className="gap-2 relative">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden lg:inline">Cart</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
