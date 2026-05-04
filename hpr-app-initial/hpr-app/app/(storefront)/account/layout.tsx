import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Package, User, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account");
  }

  const name = user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Customer";

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="rounded-lg border bg-card p-4 mb-4">
            <p className="font-medium text-sm truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <nav className="space-y-1">
            <AccountNavLink href="/account" icon={<Package className="h-4 w-4" />}>
              My Orders
            </AccountNavLink>
            <AccountNavLink href="/account/profile" icon={<User className="h-4 w-4" />}>
              Profile
            </AccountNavLink>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </form>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function AccountNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
