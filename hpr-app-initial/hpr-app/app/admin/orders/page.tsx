"use client";

import { useState, useEffect, useCallback } from "react";

interface Order {
  id: number;
  order_id: string;
  stripe_session_id: string;
  customer_email: string;
  customer_name: string;
  payment_method: "card" | "ach";
  amount_total_cents: number;
  status: "paid" | "pending" | "failed" | "shipped" | "cancelled";
  items: Array<{
    name: string;
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
    country?: string;
  };
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminOrdersPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Check auth on mount
  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => {
        if (r.ok) setAuthenticated(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/admin/orders");
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
  }, []);

  useEffect(() => {
    if (authenticated) fetchOrders();
  }, [authenticated, fetchOrders]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password }),
    });
    if (res.ok) {
      setAuthenticated(true);
    } else {
      setLoginError("Invalid password");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setAuthenticated(false);
    setOrders([]);
  };

  const handleStatusUpdate = async (order: Order, newStatus: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stripeSessionId: order.stripe_session_id,
        status: newStatus,
      }),
    });
    if (res.ok) {
      fetchOrders();
      setSelectedOrder(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen password={password} setPassword={setPassword} loginError={loginError} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1a5632] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Heat Pump Ranch — Orders</h1>
          <p className="text-sm text-green-200">Admin Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowChangePassword(true)}
            className="text-sm text-green-200 hover:text-white underline"
          >
            Change Password
          </button>
          <button
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Orders" value={orders.length} />
          <StatCard label="Paid" value={orders.filter((o) => o.status === "paid").length} color="green" />
          <StatCard label="Pending (ACH)" value={orders.filter((o) => o.status === "pending").length} color="amber" />
          <StatCard label="Shipped" value={orders.filter((o) => o.status === "shipped").length} color="blue" />
          <StatCard label="Failed" value={orders.filter((o) => o.status === "failed").length} color="red" />
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">All Orders</h2>
            <button onClick={fetchOrders} className="text-sm text-blue-600 hover:underline">
              Refresh
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p className="text-lg">No orders yet</p>
              <p className="text-sm mt-1">Orders will appear here after customers complete checkout.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Items</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Payment</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{order.order_id}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{order.customer_name}</div>
                        <div className="text-gray-500 text-xs">{order.customer_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.items.reduce((sum, i) => sum + i.quantity, 0)} item(s)
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${(order.amount_total_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            order.payment_method === "card"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {order.payment_method === "card" ? "Card" : "ACH"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 hover:underline text-xs font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}

/* ─── Sub-components ─── */

function LoginScreen({
  password,
  setPassword,
  loginError,
  onLogin,
}: {
  password: string;
  setPassword: (v: string) => void;
  loginError: string;
  onLogin: (e: React.FormEvent) => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[#1a5632]">Heat Pump Ranch</h1>
            <p className="text-sm text-gray-500 mt-1">Admin Orders Dashboard</p>
          </div>
          <form onSubmit={onLogin}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5632] focus:border-transparent"
              placeholder="Enter admin password"
              autoFocus
            />
            {loginError && <p className="text-red-600 text-xs mt-2">{loginError}</p>}
            <button
              type="submit"
              className="w-full mt-4 bg-[#1a5632] text-white py-2 rounded-md font-medium hover:bg-[#154528] transition-colors"
            >
              Sign In
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">
            Forgot password? Update ADMIN_PASSWORD in Netlify env vars.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorMap: Record<string, string> = {
    green: "text-green-700 bg-green-50 border-green-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    blue: "text-blue-700 bg-blue-50 border-blue-200",
    red: "text-red-700 bg-red-50 border-red-200",
  };
  const classes = color ? colorMap[color] : "text-gray-700 bg-white border-gray-200";
  return (
    <div className={`rounded-lg border p-4 ${classes}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    shipped: "bg-blue-100 text-blue-700",
    cancelled: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${map[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onStatusUpdate,
}: {
  order: Order;
  onClose: () => void;
  onStatusUpdate: (order: Order, status: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">Order {order.order_id}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Customer Info */}
          <div>
            <h4 className="font-semibold text-sm text-gray-500 uppercase mb-2">Customer</h4>
            <p className="font-medium">{order.customer_name}</p>
            <p className="text-sm text-gray-600">{order.customer_email}</p>
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div>
              <h4 className="font-semibold text-sm text-gray-500 uppercase mb-2">Shipping Address</h4>
              <p className="text-sm">
                {order.shipping_address.name && <span className="block">{order.shipping_address.name}</span>}
                {order.shipping_address.line1 && <span className="block">{order.shipping_address.line1}</span>}
                {order.shipping_address.line2 && <span className="block">{order.shipping_address.line2}</span>}
                <span className="block">
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                </span>
                {order.shipping_address.country && <span className="block">{order.shipping_address.country}</span>}
              </p>
            </div>
          )}

          {/* Items */}
          <div>
            <h4 className="font-semibold text-sm text-gray-500 uppercase mb-2">Items</h4>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 border-b">
                <tr>
                  <th className="text-left py-1">Item</th>
                  <th className="text-center py-1">Qty</th>
                  <th className="text-right py-1">Unit Price</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-2">{item.name}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">${(item.unit_price_cents / 100).toFixed(2)}</td>
                    <td className="py-2 text-right font-medium">
                      ${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment & Status */}
          <div className="flex gap-6">
            <div>
              <h4 className="font-semibold text-sm text-gray-500 uppercase mb-1">Payment</h4>
              <p className="text-sm capitalize">{order.payment_method === "card" ? "Credit Card" : "ACH Bank Transfer"}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-500 uppercase mb-1">Total</h4>
              <p className="text-sm font-bold">
                ${(order.amount_total_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-500 uppercase mb-1">Status</h4>
              <StatusBadge status={order.status} />
            </div>
          </div>

          {/* Tracking */}
          {order.tracking_number && (
            <div>
              <h4 className="font-semibold text-sm text-gray-500 uppercase mb-1">Tracking Number</h4>
              <p className="text-sm font-mono">{order.tracking_number}</p>
            </div>
          )}

          {/* Status Actions */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-500 uppercase mb-2">Update Status</h4>
            <div className="flex flex-wrap gap-2">
              {["paid", "shipped", "cancelled"].map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusUpdate(order, s)}
                  disabled={order.status === s}
                  className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                    order.status === s
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  Mark as {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change-password", currentPassword: currentPw, newPassword: newPw }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(data.message);
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Change Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}
          <button
            type="submit"
            className="w-full bg-[#1a5632] text-white py-2 rounded-md font-medium hover:bg-[#154528]"
          >
            Update Password
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-3">
          Note: Password changes require updating the ADMIN_PASSWORD environment variable in Netlify and redeploying.
        </p>
      </div>
    </div>
  );
}
