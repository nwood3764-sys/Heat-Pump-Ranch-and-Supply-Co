"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2 } from "lucide-react";

export function SignupForm() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, company, role },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="font-semibold text-green-900">You&apos;re Almost In!</div>
        </div>
        <p className="text-sm text-green-800">
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your account and start accessing contractor pricing.
        </p>
        <p className="text-xs text-green-700 mt-3">
          Didn&apos;t receive it? Check your spam folder or contact us at{" "}
          <a href="mailto:orders@heatpumpranch.com" className="underline">
            orders@heatpumpranch.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
            Full Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            required
            autoComplete="name"
            placeholder="John Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="company" className="block text-sm font-medium mb-1.5">
            Company Name
          </label>
          <Input
            id="company"
            autoComplete="organization"
            placeholder="Smith HVAC LLC"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium mb-1.5">
          I am a...
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Select your role (optional)</option>
          <option value="hvac_contractor">HVAC Contractor</option>
          <option value="dealer">Equipment Dealer</option>
          <option value="installer">Installer / Technician</option>
          <option value="builder">Builder / General Contractor</option>
          <option value="homeowner">Homeowner</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Email Address <span className="text-destructive">*</span>
        </label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="john@smithhvac.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1.5">
          Password <span className="text-destructive">*</span>
        </label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Minimum 8 characters
        </p>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? "Creating Your Account..." : "Create Free Account"}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By creating an account, you agree to our{" "}
        <a href="/terms" className="underline hover:text-foreground">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
