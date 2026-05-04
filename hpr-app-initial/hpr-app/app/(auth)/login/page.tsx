import { Suspense } from "react";
import { LoginForm } from "./login-form";
import Link from "next/link";
import {
  DollarSign,
  Truck,
  ClipboardList,
  Zap,
  MessageCircle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const metadata = { title: "Sign In — The Heat Pump Ranch & Supply Co." };

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-10rem)]">
      {/* Desktop: side-by-side layout / Mobile: stacked */}
      <div className="container max-w-6xl py-8 md:py-16">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-start">
          {/* LEFT: Sign In Form */}
          <div className="w-full max-w-md mx-auto md:mx-0">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground mb-8">
              Sign in to access your orders, saved quotes, and contractor pricing.
            </p>

            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm />
            </Suspense>

            <p className="text-sm text-muted-foreground mt-6">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-primary hover:underline font-semibold"
              >
                Create one
              </Link>
            </p>
          </div>

          {/* RIGHT: CTA Panel for Dealers & Contractors */}
          <div className="w-full">
            <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] p-6 md:p-8 lg:p-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide mb-4">
                <Zap className="h-3.5 w-3.5" />
                For Dealers &amp; Contractors
              </div>

              <h2 className="text-xl md:text-2xl font-bold mb-3">
                Join The Heat Pump Ranch
              </h2>
              <p className="text-muted-foreground mb-6 text-sm md:text-base">
                Create an account and get access to exclusive contractor
                pricing, fast quotes, and dedicated equipment support.
              </p>

              {/* Benefits */}
              <div className="space-y-4 mb-8">
                <BenefitItem
                  icon={<DollarSign className="h-5 w-5" />}
                  title="Contractor Pricing"
                  description="Access dealer-level pricing on heat pumps, mini-splits, and accessories"
                />
                <BenefitItem
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="Save & Manage Quotes"
                  description="Build project quotes, save them, and come back anytime"
                />
                <BenefitItem
                  icon={<Truck className="h-5 w-5" />}
                  title="Order Tracking"
                  description="Real-time updates on every order from placement to delivery"
                />
                <BenefitItem
                  icon={<MessageCircle className="h-5 w-5" />}
                  title="Chat with Equipment Specialists"
                  description="Get expert help choosing the right system for your project"
                />
                <BenefitItem
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Dedicated Support"
                  description="Priority assistance for dealers and HVAC professionals"
                />
              </div>

              {/* CTA Button */}
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-primary text-primary-foreground font-semibold text-base h-12 px-6 hover:bg-primary/90 transition-colors"
              >
                Create Your Pro Account
                <ArrowRight className="h-4 w-4" />
              </Link>

              <p className="text-xs text-muted-foreground text-center mt-3">
                Takes less than 2 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <div>
        <div className="block text-sm font-medium mb-1.5">Email</div>
        <div className="h-10 w-full rounded-md border bg-muted/30" />
      </div>
      <div>
        <div className="block text-sm font-medium mb-1.5">Password</div>
        <div className="h-10 w-full rounded-md border bg-muted/30" />
      </div>
      <div className="h-11 w-full rounded-md bg-muted/50" />
    </div>
  );
}
