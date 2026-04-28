import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Boxes, Award, ShoppingBag, Users, AlertCircle } from "lucide-react";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: productCount },
    { count: systemCount },
    { count: ahriCount },
    { count: orderCount },
    { count: contractorCount },
    { count: pendingContractorCount },
    { data: lastSync },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("system_packages").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("ahri_certifications").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("contractor_accounts").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("contractor_accounts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("sync_runs")
      .select("portal, status, products_added, products_updated, price_changes, completed_at")
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    { label: "Active Products", value: productCount ?? 0, icon: Package },
    { label: "System Packages", value: systemCount ?? 0, icon: Boxes },
    { label: "AHRI Certifications", value: ahriCount ?? 0, icon: Award },
    { label: "Orders", value: orderCount ?? 0, icon: ShoppingBag },
    { label: "Approved Contractors", value: contractorCount ?? 0, icon: Users },
    { label: "Pending Contractor Apps", value: pendingContractorCount ?? 0, icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          High-level state of the catalog and operations.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Recent Syncs</h3>
          {lastSync && lastSync.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 font-medium">Portal</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Added</th>
                  <th className="py-2 font-medium text-right">Updated</th>
                  <th className="py-2 font-medium text-right">Price Changes</th>
                  <th className="py-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {lastSync.map((s, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-medium uppercase">{s.portal}</td>
                    <td className="py-2">{s.status}</td>
                    <td className="py-2 text-right">{s.products_added ?? 0}</td>
                    <td className="py-2 text-right">{s.products_updated ?? 0}</td>
                    <td className="py-2 text-right">{s.price_changes ?? 0}</td>
                    <td className="py-2 text-muted-foreground text-xs">
                      {s.completed_at ? new Date(s.completed_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No syncs yet. The first nightly run will populate this table.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
