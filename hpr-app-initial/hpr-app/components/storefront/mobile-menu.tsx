"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Home, Package, Wrench, MapPin, GraduationCap, Users, Phone, User, LogOut, UserPlus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MOBILE_NAV = [
  { label: "Home", href: "/", icon: Home },
  {
    label: "Products",
    href: "/products",
    icon: Package,
    children: [
      { label: "Heat Pumps", href: "/catalog?system_type=ducted" },
      { label: "Ductless Mini-Splits", href: "/catalog?system_type=non-ducted" },
      { label: "Water Heaters", href: "/catalog?system_type=water-heater" },
      { label: "Accessories", href: "/accessories" },
      { label: "Parts", href: "/catalog?type=parts" },
      { label: "Shop All Products", href: "/catalog" },
    ],
  },
  {
    label: "Services",
    href: "/services",
    icon: Wrench,
    children: [
      { label: "System Design", href: "/services#system-design" },
      { label: "Technical Support", href: "/services#technical-support" },
      { label: "Financing", href: "/services#financing" },
      { label: "Warranty Support", href: "/services#warranty" },
    ],
  },
  { label: "Locations", href: "/locations", icon: MapPin },
  {
    label: "Training & Events",
    href: "/training",
    icon: GraduationCap,
    children: [
      { label: "Upcoming Trainings", href: "/training#upcoming" },
      { label: "Training Class Recordings", href: "/training#recordings" },
    ],
  },
  { label: "About Us", href: "/about", icon: Users },
  { label: "Contact Us", href: "/contact", icon: Phone },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

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
      <div className={`fixed top-0 left-0 h-full w-80 bg-background z-50 transform transition-transform duration-200 ease-in-out overflow-y-auto ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-[#2d6a7a]">
          <span className="font-bold text-sm text-white">The Heat Pump Ranch</span>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="p-2 text-white hover:bg-white/10">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-0.5">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const hasChildren = "children" in item && item.children;
            const isExpanded = expandedItem === item.label;

            return (
              <div key={item.label}>
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 flex-1 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-muted transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="h-4 w-4 text-[#2d6a7a]" />
                    {item.label}
                  </Link>
                  {hasChildren && (
                    <button
                      onClick={() => setExpandedItem(isExpanded ? null : item.label)}
                      className="p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
                {hasChildren && isExpanded && (
                  <div className="ml-10 space-y-0.5 mb-1">
                    {item.children!.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Account section */}
        <div className="border-t p-4 mt-2">
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
                <Button className="w-full gap-2 bg-[#2d6a7a] hover:bg-[#245a68]" size="sm">
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </Button>
              </Link>
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
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
