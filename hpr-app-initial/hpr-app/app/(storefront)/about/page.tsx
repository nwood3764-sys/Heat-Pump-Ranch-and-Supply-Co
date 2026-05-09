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
      {/* Page Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">About Us</h1>
          <p className="text-blue-100 max-w-2xl">
            Your trusted partner in heat pump solutions — serving contractors and dealers with integrity, expertise, and competitive pricing.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section id="story" className="container py-10 md:py-14">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Our Story</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">The Heat Pump Ranch &amp; Supply Co.</h2>
          <div className="space-y-4 text-slate-600 leading-relaxed">
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
      <section className="bg-slate-900 text-white py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Our Values</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              These principles guide everything we do — from how we select products to how we support our customers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div key={value.title} className="text-center p-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-500/20 border border-blue-400/30 mb-4">
                    <Icon className="h-7 w-7 text-blue-300" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{value.title}</h3>
                  <p className="text-sm text-slate-400">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="container py-10 md:py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Our Team</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            A dedicated team of HVAC professionals committed to your success.
          </p>
        </div>

        <div className="border border-slate-200 rounded-lg bg-white p-8 md:p-12 text-center max-w-2xl mx-auto">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-lg text-slate-900 mb-2">Meet the Team</h3>
          <p className="text-slate-600 mb-6">
            Our team includes experienced HVAC professionals, technical advisors, and customer service specialists — all focused on helping you succeed in the heat pump market.
          </p>
          <Link href="/contact">
            <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold">
              Get in Touch <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Careers */}
      <section id="careers" className="bg-slate-50 py-10 md:py-14">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Careers</h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-6">
            Interested in joining our team? We are always looking for passionate people who want to be part of the heat pump revolution.
          </p>
          <Link href="/contact">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Contact Us About Opportunities <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
