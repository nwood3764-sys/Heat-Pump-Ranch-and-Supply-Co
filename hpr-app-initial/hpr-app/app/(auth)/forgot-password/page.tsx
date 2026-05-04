"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="container max-w-md py-16">
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-xl font-bold mb-2">Check Your Email</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a password reset link to <strong>{email}</strong>. 
            Click the link in the email to set a new password.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <button
              onClick={() => setSent(false)}
              className="text-primary hover:underline"
            >
              try again
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md py-16">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Sign In
      </Link>

      <h1 className="text-2xl font-bold mb-2">Reset Your Password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Email
          </label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
    </div>
  );
}
