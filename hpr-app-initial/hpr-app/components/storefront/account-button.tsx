"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, LogOut, Package, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AccountButton() {
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Not logged in — show login link
  if (!user) {
    return (
      <Link href="/login">
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden lg:inline">Account</span>
        </Button>
      </Link>
    );
  }

  // Logged in — show dropdown
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <User className="h-4 w-4" />
        <span className="hidden lg:inline truncate max-w-[120px]">
          {user.name || user.email.split("@")[0]}
        </span>
        <ChevronDown className="h-3 w-3 hidden lg:block" />
      </Button>

      {menuOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-card shadow-lg z-50 py-2">
            <div className="px-4 py-2 border-b mb-1">
              <p className="text-sm font-medium truncate">{user.name || "Customer"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>

            <Link
              href="/account"
              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <Package className="h-4 w-4" />
              My Orders
            </Link>

            <Link
              href="/account/profile"
              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>

            <div className="border-t mt-1 pt-1">
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
