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
      {/* Page Header */}
      <section className="bg-[#2d6a7a] text-white py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Our Services</h1>
          <p className="text-white/80 max-w-2xl">
            We take pride in providing innovative ways to add value to our relationship and help you grow your business.
          </p>
        </div>
      </section>

      {/* Services List */}
      <section className="container py-10 md:py-14">
        <div className="space-y-12">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                id={service.id}
                className={`flex flex-col md:flex-row gap-6 md:gap-10 items-start ${
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-[#2d6a7a]/10 flex items-center justify-center">
                    <Icon className="h-8 w-8 text-[#2d6a7a]" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold mb-3">{service.title}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">{service.description}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d4a843] flex-shrink-0" />
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
      <section className="bg-[#1e3a4a] text-white py-12 md:py-16">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Need Help With a Project?</h2>
          <p className="text-white/70 mb-8 max-w-lg mx-auto">
            Our team is ready to assist you with system design, product selection, and technical questions.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" className="bg-[#d4a843] hover:bg-[#c09935] text-[#1e3a4a] font-bold">
                Contact Us <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="tel:+16088309224">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold">
                <Phone className="h-4 w-4 mr-2" />
                608-830-9224
              </Button>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
