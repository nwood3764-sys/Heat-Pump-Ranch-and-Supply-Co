"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase will auto-detect the recovery token from the URL hash
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    // Also check if already in a session (page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/account"), 2000);
    }
  }

  if (success) {
    return (
      <div className="container max-w-md py-16">
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-xl font-bold mb-2">Password Updated</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been reset. Redirecting to your account...
          </p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="container max-w-md py-16">
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold mb-2">Loading...</h1>
          <p className="text-sm text-muted-foreground">
            Verifying your reset link. If this takes too long, the link may have expired.
            <br />
            <a href="/forgot-password" className="text-primary hover:underline mt-2 inline-block">
              Request a new reset link
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md py-16">
      <h1 className="text-2xl font-bold mb-2">Set New Password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Choose a new password for your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">
            New Password
          </label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">
            Confirm New Password
          </label>
          <Input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">At least 8 characters.</p>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Updating..." : "Reset Password"}
        </Button>
      </form>
    </div>
  );
}
