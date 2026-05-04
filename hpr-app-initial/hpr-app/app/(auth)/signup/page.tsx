import { SignupForm } from "./signup-form";
import Link from "next/link";
import {
  DollarSign,
  Truck,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

export const metadata = { title: "Create Account — The Heat Pump Ranch & Supply Co." };

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-10rem)]">
      <div className="container max-w-6xl py-8 md:py-16">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-start">
          {/* LEFT: Benefits Panel */}
          <div className="order-2 md:order-1">
            <div className="rounded-xl bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] border border-primary/10 p-6 md:p-8 lg:p-10">
              <h2 className="text-xl md:text-2xl font-bold mb-2">
                Why Create an Account?
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Join hundreds of HVAC dealers and contractors who trust The Heat
                Pump Ranch for their equipment needs.
              </p>

              <div className="space-y-5">
                <BenefitRow
                  icon={<DollarSign className="h-5 w-5" />}
                  title="Exclusive Contractor Pricing"
                  description="See dealer-level prices on all heat pumps, mini-splits, and accessories — savings you won't find elsewhere."
                />
                <BenefitRow
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="Build & Save Quotes"
                  description="Create project quotes for your customers, save them to your account, and revisit anytime."
                />
                <BenefitRow
                  icon={<Truck className="h-5 w-5" />}
                  title="Track Every Order"
                  description="Real-time shipping updates from the moment you place an order to doorstep delivery."
                />
                <BenefitRow
                  icon={<MessageCircle className="h-5 w-5" />}
                  title="Chat with Equipment Specialists"
                  description="Need help selecting the right system? Our team is available to help you spec the perfect setup."
                />
                <BenefitRow
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Priority Dealer Support"
                  description="Get faster responses and dedicated assistance as a registered professional."
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Sign Up Form */}
          <div className="order-1 md:order-2 w-full max-w-md mx-auto md:mx-0">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>

            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Create Your Pro Account
            </h1>
            <p className="text-muted-foreground mb-8">
              Get started in under 2 minutes. Access contractor pricing, order
              tracking, and expert support.
            </p>

            <SignupForm />

            <p className="text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary hover:underline font-semibold"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitRow({
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
      <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
