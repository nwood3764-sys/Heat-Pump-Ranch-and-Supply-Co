import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Package, ChevronRight, Truck, Clock, CheckCircle, XCircle } from "lucide-react";

export const metadata = { title: "My Orders" };
export const dynamic = "force-dynamic";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  paid: { label: "Processing", icon: <Clock className="h-3.5 w-3.5" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  pending: { label: "Pending Payment", icon: <Clock className="h-3.5 w-3.5" />, color: "text-amber-600 bg-amber-50 border-amber-200" },
  shipped: { label: "Shipped", icon: <Truck className="h-3.5 w-3.5" />, color: "text-green-600 bg-green-50 border-green-200" },
  delivered: { label: "Delivered", icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-green-700 bg-green-50 border-green-200" },
  cancelled: { label: "Cancelled", icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-600 bg-red-50 border-red-200" },
  failed: { label: "Payment Failed", icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-600 bg-red-50 border-red-200" },
};

export default async function AccountOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/account");

  // Get app user
  const serviceClient = createServiceClient();
  const { data: appUser } = await serviceClient
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!appUser) redirect("/login?redirect=/account");

  // First try to claim any unclaimed orders for this email
  await serviceClient
    .from("orders")
    .update({ user_id: appUser.id })
    .eq("customer_email", user.email!)
    .is("user_id", null);

  // Fetch all orders for this user
  const { data: orders } = await serviceClient
    .from("orders")
    .select("order_id, status, amount_total_cents, items, created_at, order_token, tracking_number, carrier, shipped_at")
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-card">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2">No orders yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            When you place an order, it will appear here.
          </p>
          <Link
            href="/"
            className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-md text-sm font-medium hover:opacity-90"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status] ?? statusConfig.paid;
            const items = order.items as Array<{ name: string; quantity: number; unit_price_cents: number }>;
            const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
            const orderUrl = order.order_token ? `/order/${order.order_token}` : "#";

            return (
              <Link
                key={order.order_id}
                href={orderUrl}
                className="block border rounded-lg bg-card hover:border-primary/30 hover:shadow-sm transition-all p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-medium">#{order.order_id}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {itemCount} {itemCount === 1 ? "item" : "items"} — {items.slice(0, 2).map((i) => i.name).join(", ")}
                      {items.length > 2 && ` +${items.length - 2} more`}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      {order.tracking_number && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {order.carrier} — {order.tracking_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm whitespace-nowrap">
                      ${(order.amount_total_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
