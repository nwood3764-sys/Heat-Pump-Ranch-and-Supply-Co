import type { Metadata } from "next";
import { Shield, DollarSign, Truck, Headphones } from "lucide-react";
import { ContractorForm } from "./contractor-form";

export const metadata: Metadata = {
  title: "Contractor Application | The Heat Pump Ranch & Supply Co.",
  description:
    "Apply for a contractor account and get access to tiered pricing on heat pumps, mini-splits, and HVAC equipment from LG and ACiQ.",
};

const BENEFITS = [
  {
    icon: DollarSign,
    title: "Tiered Pricing",
    description:
      "Approved contractors receive dedicated pricing tiers with significant savings over retail on all equipment.",
  },
  {
    icon: Truck,
    title: "Priority Fulfillment",
    description:
      "Contractor orders are prioritized for fast processing and shipping to keep your projects on schedule.",
  },
  {
    icon: Shield,
    title: "Dedicated Account",
    description:
      "Get a dedicated account with order history, saved projects, and streamlined reordering for repeat purchases.",
  },
  {
    icon: Headphones,
    title: "Expert Support",
    description:
      "Direct access to our equipment specialists for system design questions, compatibility checks, and technical support.",
  },
];

export default function ContractorPage() {
  return (
    <div className="container py-10 max-w-5xl">
      {/* Header */}
      <section className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Contractor Account Application
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl">
          Are you a licensed HVAC contractor, installer, or equipment dealer?
          Apply for a contractor account to unlock tiered pricing on our full
          catalog of LG and ACiQ heat pump equipment.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Benefits — left column on desktop */}
        <div className="lg:col-span-2 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Contractor Benefits
          </h2>
          <div className="space-y-4">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <b.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {b.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {b.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Requirements */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Requirements
            </h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>Active business in HVAC installation, service, or sales</li>
              <li>Valid business entity (LLC, Corp, Sole Prop, etc.)</li>
              <li>Contractor license preferred but not required</li>
              <li>Must have an account on our site (sign up first if needed)</li>
            </ul>
          </div>
        </div>

        {/* Form — right column on desktop */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Apply Now
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Fill out the form below. You must be signed in to submit an application.
              Applications are typically reviewed within 1–2 business days.
            </p>
            <ContractorForm />
          </div>
        </div>
      </div>
    </div>
  );
}
