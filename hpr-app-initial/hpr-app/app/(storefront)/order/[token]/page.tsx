"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Package, Truck, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface OrderData {
  order_id: string;
  status: string;
  customer_name: string;
  customer_email: string;
  payment_method: string;
  amount_total_cents: number;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unit_price_cents: number;
  }>;
  shipping_address?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  created_at: string;
}

const statusConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  paid: { icon: CheckCircle, label: "Payment Confirmed", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  pending: { icon: Clock, label: "Payment Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  shipped: { icon: Truck, label: "Shipped", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  cancelled: { icon: AlertCircle, label: "Cancelled", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  failed: { icon: AlertCircle, label: "Payment Failed", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

export default function OrderStatusPage() {
  const params = useParams();
  const token = params.token as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${token}`);
        if (!res.ok) {
          setError("Order not found. This link may have expired.");
          return;
        }
        const data = await res.json();
        setOrder(data);
      } catch {
        setError("Failed to load order details.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [token]);

  if (loading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
          <Link href="/" className="inline-block mt-6 text-primary underline">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[order.status] ?? statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      {/* Status Banner */}
      <div className={`rounded-lg border p-6 mb-8 ${status.bg}`}>
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-8 w-8 ${status.color}`} />
          <div>
            <h1 className="text-2xl font-bold">{status.label}</h1>
            <p className="text-sm text-muted-foreground">Order #{order.order_id}</p>
          </div>
        </div>
      </div>

      {/* Tracking Info */}
      {order.tracking_number && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-5 w-5 text-blue-700" />
            <h2 className="font-semibold text-blue-900">Shipment Tracking</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-blue-700 uppercase font-medium">Carrier</p>
              <p className="font-semibold">{order.carrier ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700 uppercase font-medium">Tracking Number</p>
              <p className="font-mono font-semibold">{order.tracking_number}</p>
            </div>
          </div>
          {order.shipped_at && (
            <p className="text-xs text-blue-600 mt-3">
              Shipped on {new Date(order.shipped_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      )}

      {/* Order Details */}
      <div className="rounded-lg border bg-card p-6 mb-8">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Order Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-muted-foreground">Order Date</p>
            <p className="font-medium">
              {new Date(order.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment Method</p>
            <p className="font-medium">{order.payment_method === "card" ? "Credit Card" : "ACH Bank Transfer"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-bold text-lg text-primary">
              ${(order.amount_total_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Items */}
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">Items</h3>
        <div className="divide-y">
          {order.items.map((item, i) => (
            <div key={i} className="py-3 flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium text-sm">
                ${((item.unit_price_cents * item.quantity) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="rounded-lg border bg-card p-6 mb-8">
          <h2 className="font-semibold mb-3">Shipping Address</h2>
          <p className="text-sm leading-relaxed">
            {order.shipping_address.name && <span className="block font-medium">{order.shipping_address.name}</span>}
            {order.shipping_address.line1 && <span className="block">{order.shipping_address.line1}</span>}
            {order.shipping_address.line2 && <span className="block">{order.shipping_address.line2}</span>}
            <span className="block">
              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
            </span>
          </p>
        </div>
      )}

      {/* Action Links */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-4">Need Help?</h2>
        <div className="space-y-3">
          <Link
            href={`/order/${token}/return`}
            className="block p-3 rounded-lg border hover:bg-muted transition-colors"
          >
            <p className="font-medium text-sm">Report Damage or Request a Return</p>
            <p className="text-xs text-muted-foreground">If your order arrived damaged or you need to return it</p>
          </Link>
          <Link
            href={`/order/${token}/create-account`}
            className="block p-3 rounded-lg border hover:bg-muted transition-colors"
          >
            <p className="font-medium text-sm">Create an Account</p>
            <p className="text-xs text-muted-foreground">Track all your orders, reorder, and manage your profile</p>
          </Link>
          <a
            href="tel:+16088309224"
            className="block p-3 rounded-lg border hover:bg-muted transition-colors"
          >
            <p className="font-medium text-sm">Call Us: 608-830-9224</p>
            <p className="text-xs text-muted-foreground">Mon-Fri 8am-5pm CT</p>
          </a>
        </div>
      </div>
    </div>
  );
}
