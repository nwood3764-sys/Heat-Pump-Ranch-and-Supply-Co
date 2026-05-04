"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";

interface OrderData {
  order_id: string;
  status: string;
  customer_name: string;
  items: Array<{ name: string; sku?: string; quantity: number }>;
}

const reasons = [
  { value: "damaged", label: "Received Damaged", description: "Item arrived with visible damage or defects" },
  { value: "wrong_item", label: "Wrong Item Received", description: "The item delivered doesn't match what was ordered" },
  { value: "not_needed", label: "No Longer Needed", description: "I no longer need this item" },
  { value: "other", label: "Other", description: "Another reason not listed above" },
];

export default function ReturnRequestPage() {
  const params = useParams();
  const token = params.token as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !description.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderToken: token, reason, description: description.trim() }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to submit return request.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Return Request Submitted</h1>
          <p className="text-muted-foreground mb-6">
            We&apos;ve received your request for order #{order?.order_id}. Our team will review it and get back to you within 1-2 business days.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            A confirmation email has been sent to your email address. If you have photos of any damage, please reply to that email with them attached.
          </p>
          <Link href={`/order/${token}`} className="inline-block text-primary underline font-medium">
            Back to Order Status
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <Link href={`/order/${token}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Order
      </Link>

      <h1 className="text-2xl font-bold mb-2">Report Damage or Request a Return</h1>
      <p className="text-muted-foreground mb-8">
        Order #{order?.order_id} — {order?.customer_name}
      </p>

      {/* Items in order */}
      <div className="rounded-lg border bg-card p-4 mb-8">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">Items in This Order</h3>
        <div className="divide-y">
          {order?.items.map((item, i) => (
            <div key={i} className="py-2 flex justify-between">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Reason Selection */}
        <div>
          <label className="block font-medium text-sm mb-3">Reason for Return</label>
          <div className="grid gap-3">
            {reasons.map((r) => (
              <label
                key={r.value}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  reason === r.value ? "border-primary bg-primary/5" : "hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-medium text-sm">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block font-medium text-sm mb-2">
            Tell us what happened <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Please describe the issue in detail. If the item was damaged, describe the damage and how it was packaged."
            className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            required
          />
        </div>

        {/* Photo tip */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            <strong>Have photos?</strong> After submitting this form, you&apos;ll receive a confirmation email. Reply to that email with photos of any damage attached — this helps us process your request faster.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!reason || !description.trim() || submitting}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {submitting ? "Submitting..." : "Submit Return Request"}
        </button>
      </form>
    </div>
  );
}
