"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle, ArrowLeft, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OrderData {
  order_id: string;
  customer_name: string;
  customer_email: string;
}

export default function CreateAccountPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const supabase = createClient();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      // Create account via Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: order!.customer_email,
        password,
        options: {
          data: { name: order!.customer_name },
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/account`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("An account with this email already exists. Try logging in instead.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // If email confirmation is disabled, the user is signed in immediately
      if (data.session) {
        // Claim orders for this email
        await fetch("/api/orders/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: order!.customer_email }),
        });
        setSuccess(true);
      } else {
        // Email confirmation required
        setSuccess(true);
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

  if (success) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Account Created!</h1>
          <p className="text-muted-foreground mb-6">
            Check your email to verify your account. Once verified, you can log in to view all your orders, track shipments, and manage your profile.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium text-sm hover:opacity-90"
            >
              Go to Login
            </Link>
            <Link
              href={`/order/${token}`}
              className="inline-block border px-6 py-3 rounded-lg font-medium text-sm hover:bg-muted"
            >
              Back to Order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-md mx-auto">
      <Link href={`/order/${token}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Order
      </Link>

      <div className="text-center mb-8">
        <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
        <p className="text-muted-foreground text-sm">
          Set a password to access your order history, track shipments, and reorder.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 mb-6">
        <div className="text-sm">
          <p className="text-muted-foreground">Account email:</p>
          <p className="font-medium">{order?.customer_email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium text-sm mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="block font-medium text-sm mb-1.5">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            required
            minLength={8}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !password || !confirmPassword}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {submitting ? "Creating Account..." : "Create Account"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
