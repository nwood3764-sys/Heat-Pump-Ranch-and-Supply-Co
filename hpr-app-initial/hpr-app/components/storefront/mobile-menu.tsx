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
      { label: "Heat Pumps", href: "/catalog?category=heat-pumps" },
      { label: "Ductless Mini-Splits", href: "/catalog?category=mini-splits" },
      { label: "Air Conditioners", href: "/catalog?category=air-conditioners" },
      { label: "Furnaces", href: "/catalog?category=furnaces" },
      { label: "Air Handlers", href: "/catalog?category=air-handlers" },
      { label: "Water Heaters", href: "/catalog?system_type=water-heater" },
      { label: "System Packages", href: "/catalog?type=systems" },
      { label: "Controls & Thermostats", href: "/catalog?product_category=accessories-parts" },
      { label: "Accessories", href: "/accessories" },
      { label: "Parts", href: "/catalog?type=parts" },
      { label: "Weatherization Materials", href: "/weatherization" },
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
      <div className={`fixed top-0 left-0 h-full w-80 bg-white z-50 transform transition-transform duration-200 ease-in-out overflow-y-auto ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-900">
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
                    className="flex items-center gap-3 flex-1 px-3 py-2.5 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="h-4 w-4 text-blue-600" />
                    {item.label}
                  </Link>
                  {hasChildren && (
                    <button
                      onClick={() => setExpandedItem(isExpanded ? null : item.label)}
                      className="p-2 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
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
                        className="block px-3 py-2 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
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
        <div className="border-t border-slate-200 p-4 mt-2">
          {user ? (
            <div className="space-y-1">
              <div className="px-3 py-2 mb-2">
                <p className="text-sm font-medium text-slate-900 truncate">{user.name || "Customer"}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <Link
                href="/account"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Package className="h-4 w-4" />
                My Orders
              </Link>
              <Link
                href="/account/profile"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                onClick={() => setOpen(false)}
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              <Link href="/signup" onClick={() => setOpen(false)}>
                <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </Button>
              </Link>
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full border-slate-300" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            <a href="tel:+16088309224" className="hover:text-slate-900">608-830-9224</a>
            {" · "}
            <a href="mailto:orders@heatpumpranch.com" className="hover:text-slate-900">orders@heatpumpranch.com</a>
          </p>
        </div>
      </div>
    </>
  );
}
