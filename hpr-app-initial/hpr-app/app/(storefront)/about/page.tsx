import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, HeartHandshake, Target, Award, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about The Heat Pump Ranch & Supply Co. — our story, values, and commitment to contractors and dealers.",
};

export default function AboutPage() {
  return (
    <>
      {/* Page Header - compact */}
      <section className="container pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">About Us</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your trusted partner in heat pump solutions — serving contractors and dealers with integrity, expertise, and competitive pricing.
        </p>
      </section>

      {/* Our Story */}
      <section id="story" className="container py-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Our Story</p>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">The Heat Pump Ranch &amp; Supply Co.</h2>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              The Heat Pump Ranch &amp; Supply Co. was founded with a simple mission: make it easy for contractors and dealers to access high-quality heat pump equipment at competitive prices. We saw an opportunity to serve the growing heat pump market with a focused, knowledgeable team that understands the unique needs of HVAC professionals.
            </p>
            <p>
              Based in Wisconsin, we serve contractors and dealers nationwide, providing AHRI-certified equipment from leading manufacturers including LG and ACiQ. Our team brings deep industry experience in residential and light-commercial HVAC systems, and we are committed to supporting the transition to efficient heat pump technology.
            </p>
            <p>
              We believe that the future of home comfort is electric, and we are here to help contractors and dealers lead that transition with confidence. From product selection and system design to technical support and training, we provide the tools and expertise you need to grow your heat pump business.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="container py-6 border-t border-slate-100">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Our Values</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-2xl">
          These principles guide everything we do — from how we select products to how we support our customers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: ShieldCheck,
              title: "Integrity",
              description: "Honest pricing, transparent business practices, and doing what we say we'll do.",
            },
            {
              icon: Target,
              title: "Expertise",
              description: "Deep knowledge of heat pump technology and the HVAC industry to guide your decisions.",
            },
            {
              icon: HeartHandshake,
              title: "Partnership",
              description: "We succeed when you succeed. Your growth is our priority.",
            },
            {
              icon: Award,
              title: "Quality",
              description: "Only AHRI-certified equipment from trusted manufacturers. No compromises.",
            },
            {
              icon: Truck,
              title: "Reliability",
              description: "Fast shipping, consistent inventory, and dependable service you can count on.",
            },
            {
              icon: Users,
              title: "Service",
              description: "Real people, real support. We answer the phone and solve problems.",
            },
          ].map((value) => {
            const Icon = value.icon;
            return (
              <div key={value.title} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Icon className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 mb-0.5">{value.title}</h3>
                  <p className="text-xs text-slate-500">{value.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="container py-6 border-t border-slate-100">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Our Team</h2>
        <p className="text-sm text-slate-500 mb-6">
          A dedicated team of HVAC professionals committed to your success.
        </p>

        <div className="border border-slate-200 rounded-lg bg-white p-6 max-w-2xl">
          <Users className="h-10 w-10 text-slate-300 mb-3" />
          <h3 className="font-semibold text-base text-slate-900 mb-2">Meet the Team</h3>
          <p className="text-sm text-slate-600 mb-4">
            Our team includes experienced HVAC professionals, technical advisors, and customer service specialists — all focused on helping you succeed in the heat pump market.
          </p>
          <Link href="/contact">
            <Button size="sm" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-medium">
              Get in Touch <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Careers */}
      <section id="careers" className="container py-6 border-t border-slate-100">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Careers</h2>
        <p className="text-sm text-slate-500 mb-4 max-w-2xl">
          Interested in joining our team? We are always looking for passionate people who want to be part of the heat pump revolution.
        </p>
        <Link href="/contact">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            Contact Us About Opportunities <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      </section>
    </>
  );
}
