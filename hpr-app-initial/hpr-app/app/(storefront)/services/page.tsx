import Link from "next/link";
import { ArrowRight, Wrench, Calculator, ShieldCheck, Phone, Zap, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
  description: "Explore our services including system design, technical support, financing, and warranty support.",
};

const SERVICES = [
  {
    id: "system-design",
    icon: Calculator,
    title: "System Design & Selection",
    description: "Our team helps you select the right equipment for every project. From Manual J load calculations to equipment matching, we ensure optimal system performance and efficiency.",
    features: [
      "Load calculation assistance",
      "Equipment selection guidance",
      "AHRI-matched system packages",
      "Energy efficiency optimization",
    ],
  },
  {
    id: "technical-support",
    icon: Wrench,
    title: "Technical Support",
    description: "Get expert guidance on installation, commissioning, and troubleshooting. Our technical advisors are available to support you through every step of the process.",
    features: [
      "Installation support",
      "Commissioning guidance",
      "Troubleshooting assistance",
      "Product specifications & documentation",
    ],
  },
  {
    id: "financing",
    icon: Zap,
    title: "Financing Options",
    description: "We offer flexible financing solutions to help your customers afford the comfort they deserve. Multiple programs available for residential and commercial projects.",
    features: [
      "Consumer financing programs",
      "Competitive rates",
      "Quick approval process",
      "Flexible terms",
    ],
  },
  {
    id: "warranty",
    icon: ShieldCheck,
    title: "Warranty Support",
    description: "All equipment comes with manufacturer warranty coverage. We help facilitate warranty claims and ensure your customers are protected.",
    features: [
      "Manufacturer warranty processing",
      "Extended warranty options",
      "Claims assistance",
      "Parts replacement coordination",
    ],
  },
  {
    id: "online-ordering",
    icon: FileText,
    title: "Online Ordering & Account Management",
    description: "Access your account 24/7 to place orders, check inventory, view invoices, and manage your business with our online platform.",
    features: [
      "24/7 online ordering",
      "Real-time inventory visibility",
      "Order history & tracking",
      "Invoice management",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* Page Header - compact */}
      <section className="container pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Our Services</h1>
        <p className="text-sm text-slate-500 mt-1">
          We take pride in providing innovative ways to add value to our relationship and help you grow your business.
        </p>
      </section>

      {/* Services List */}
      <section className="container py-6">
        <div className="space-y-8">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                id={service.id}
                className={`flex flex-col md:flex-row gap-4 md:gap-8 items-start ${
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-900 mb-2">{service.title}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">{service.description}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-8 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">Need Help With a Project?</h2>
            <p className="text-sm text-slate-500">
              Our team is ready to assist you with system design, product selection, and technical questions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/contact">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                Contact Us <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
            <a href="tel:+16088309224">
              <Button size="sm" variant="outline" className="border-slate-300 text-slate-700 font-medium">
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                608-830-9224
              </Button>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
