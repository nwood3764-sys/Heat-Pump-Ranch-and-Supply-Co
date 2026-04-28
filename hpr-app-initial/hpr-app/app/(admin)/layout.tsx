import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LayoutDashboard, Package, Boxes, Tag, BadgeDollarSign, RefreshCw,
  ShoppingBag, Users, Upload,
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/systems", label: "System Packages", icon: Boxes },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/pricing", label: "Pricing", icon: BadgeDollarSign },
  { href: "/admin/sync", label: "Sync", icon: RefreshCw },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/contractors", label: "Contractors", icon: Users },
  { href: "/admin/import", label: "CSV Import", icon: Upload },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth: middleware already gates this, but we also check here
  // so a misconfigured matcher can't expose admin pages.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("users")
    .select("role, name, email")
    .eq("auth_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col shrink-0 hidden md:flex">
        <div className="h-16 px-6 flex items-center border-b">
          <Link href="/" className="font-bold text-base">
            HPR Admin
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t text-xs text-muted-foreground">
          <div className="font-medium text-foreground truncate">
            {profile?.name ?? profile?.email}
          </div>
          <div className="truncate">{profile?.email}</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-background flex items-center px-6">
          <h1 className="font-semibold">Admin</h1>
          <div className="ml-auto">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              View site →
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6 bg-background">{children}</main>
      </div>
    </div>
  );
}
