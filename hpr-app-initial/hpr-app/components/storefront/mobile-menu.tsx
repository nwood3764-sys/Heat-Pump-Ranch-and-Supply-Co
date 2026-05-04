"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Home, Package, Phone, User, LogOut, MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          email: authUser.email ?? "",
          name: authUser.user_metadata?.name,
        });
      }
    }
    checkAuth();
  }, []);

  // Close menu on route change
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="p-2">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-background z-50 transform transition-transform duration-200 ease-in-out ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-sm">The Heat Pump Ranch</span>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="p-2">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-muted transition-colors"
            onClick={() => setOpen(false)}
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            href="/catalog"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-muted transition-colors"
            onClick={() => setOpen(false)}
          >
            <Package className="h-4 w-4" />
            Shop All Products
          </Link>
          <Link
            href="/contact"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-muted transition-colors"
            onClick={() => setOpen(false)}
          >
            <Phone className="h-4 w-4" />
            Contact Us
          </Link>
        </nav>

        {/* Chat indicator */}
        <div className="mx-4 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="relative">
              <MessageCircle className="h-4 w-4 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500" />
            </div>
            <span className="text-xs font-semibold text-primary">Live Chat Available</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Chat with an equipment specialist for help choosing the right system.
          </p>
        </div>

        {/* Account section */}
        <div className="border-t p-4">
          {user ? (
            <div className="space-y-1">
              <div className="px-3 py-2 mb-2">
                <p className="text-sm font-medium truncate">{user.name || "Customer"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <Link
                href="/account"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-muted transition-colors"
                onClick={() => setOpen(false)}
              >
                <Package className="h-4 w-4" />
                My Orders
              </Link>
              <Link
                href="/account/profile"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-muted transition-colors"
                onClick={() => setOpen(false)}
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              <Link href="/signup" onClick={() => setOpen(false)}>
                <Button className="w-full gap-2" size="sm">
                  <UserPlus className="h-4 w-4" />
                  Create Free Account
                </Button>
              </Link>
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full" size="sm">
                  Sign In
                </Button>
              </Link>
              <p className="text-[11px] text-muted-foreground text-center">
                Get contractor pricing, order tracking &amp; expert support
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            <a href="tel:+16088309224" className="hover:text-foreground">608-830-9224</a>
            {" · "}
            <a href="mailto:orders@heatpumpranch.com" className="hover:text-foreground">orders@heatpumpranch.com</a>
          </p>
        </div>
      </div>
    </>
  );
}
