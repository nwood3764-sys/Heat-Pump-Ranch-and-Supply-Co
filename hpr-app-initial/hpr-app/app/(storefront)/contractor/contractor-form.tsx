"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle } from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC",
];

export function ContractorForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const resp = await fetch("/api/contractor-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          contact_name: contactName,
          phone,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
          license_number: licenseNumber || undefined,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        if (resp.status === 401) {
          setError("Please sign in or create an account first, then return to this page to apply.");
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    }

    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="font-semibold text-green-900">Application Submitted!</div>
        </div>
        <p className="text-sm text-green-800">
          Thank you for applying. We review applications within 1–2 business days.
          Once approved, you&apos;ll receive an email confirming your contractor
          pricing tier has been activated.
        </p>
        <p className="text-xs text-green-700 mt-3">
          Questions? Contact us at{" "}
          <a href="mailto:orders@heatpumpranch.com" className="underline">
            orders@heatpumpranch.com
          </a>{" "}
          or call{" "}
          <a href="tel:+16088309224" className="underline">
            608-830-9224
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Company & Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="company_name" className="block text-sm font-medium mb-1.5">
            Company Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="company_name"
            required
            autoComplete="organization"
            placeholder="Smith HVAC LLC"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="contact_name" className="block text-sm font-medium mb-1.5">
            Contact Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="contact_name"
            required
            autoComplete="name"
            placeholder="John Smith"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1.5">
          Phone Number <span className="text-destructive">*</span>
        </label>
        <Input
          id="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1.5">
          Business Address
        </label>
        <Input
          id="address"
          autoComplete="street-address"
          placeholder="123 Main St"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {/* City, State, Zip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium mb-1.5">
            City
          </label>
          <Input
            id="city"
            autoComplete="address-level2"
            placeholder="Madison"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium mb-1.5">
            State
          </label>
          <select
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            autoComplete="address-level1"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="zip" className="block text-sm font-medium mb-1.5">
            ZIP Code
          </label>
          <Input
            id="zip"
            autoComplete="postal-code"
            placeholder="53703"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
          />
        </div>
      </div>

      {/* License Number */}
      <div>
        <label htmlFor="license_number" className="block text-sm font-medium mb-1.5">
          Contractor License Number
        </label>
        <Input
          id="license_number"
          placeholder="Optional — speeds up approval"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          If you have an HVAC contractor license, providing it helps us verify and approve your account faster.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? "Submitting Application..." : "Submit Contractor Application"}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By submitting, you agree to our{" "}
        <a href="/terms" className="underline hover:text-foreground">
          Terms of Service
        </a>
        . We&apos;ll review your application and respond within 1–2 business days.
      </p>
    </form>
  );
}
