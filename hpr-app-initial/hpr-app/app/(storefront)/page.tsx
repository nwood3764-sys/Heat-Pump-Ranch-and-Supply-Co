import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package, Wrench, MapPin, GraduationCap, ShieldCheck, Truck, HeartHandshake, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      {/* Hero Section — clean blue gradient, not dark teal */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 text-white overflow-hidden">
        {/* Subtle geometric pattern */}
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute inset-0" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20h20v20H20zM0 0h20v20H0z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E\")",
          }} />
        </div>

        <div className="container relative py-16 md:py-24 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20">
              <Zap className="h-4 w-4 text-amber-300" />
              <span>AHRI-Certified Heat Pump Systems</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 leading-tight">
              Premium HVAC Equipment,
              <br />
              <span className="text-blue-200">Delivered Direct</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl leading-relaxed">
              Residential and light-commercial heat pumps, mini-splits, and system packages from LG and ACiQ. Expert support and competitive pricing for contractors and dealers.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/catalog">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-lg">
                  Shop Products
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators — horizontal strip */}
      <section className="bg-white border-b border-slate-100">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">AHRI Certified</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Truck className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">Nationwide Shipping</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Star className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">Top Brands</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <HeartHandshake className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">Expert Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="py-14 md:py-20 bg-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Who We Are</p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">The Heat Pump Ranch &amp; Supply Co.</h2>
            <p className="text-slate-600 leading-relaxed mb-8 text-base md:text-lg">
              We are a leading distributor of heat pump equipment, parts, and accessories for residential and light-commercial applications. Serving contractors and dealers nationwide, we provide AHRI-certified systems from top brands like LG and ACiQ at competitive pricing.
            </p>
            <Link href="/about">
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold">
                Learn More About Us
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Our Services Section — 2x2 grid, different from GA Larson's layout */}
      <section className="py-14 md:py-20 bg-slate-50">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">What We Offer</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Everything you need to grow your HVAC business, from equipment to expert guidance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Service Card 1 */}
            <Link href="/catalog" className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mb-4 group-hover:bg-blue-200 transition-colors">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Online Store</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Browse our full catalog, check inventory, and place orders online 24/7.</p>
            </Link>

            {/* Service Card 2 */}
            <Link href="/services#technical-support" className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mb-4 group-hover:bg-blue-200 transition-colors">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Technical Support</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Expert guidance on system design, installation, and troubleshooting.</p>
            </Link>

            {/* Service Card 3 */}
            <Link href="/training" className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mb-4 group-hover:bg-blue-200 transition-colors">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Training &amp; Events</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Technical, service, and business training opportunities for your team.</p>
            </Link>

            {/* Service Card 4 */}
            <Link href="/locations" className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mb-4 group-hover:bg-blue-200 transition-colors">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Locations &amp; Coverage</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Find our service areas and distribution coverage across the nation.</p>
            </Link>
          </div>

          <div className="text-center mt-10">
            <Link href="/services">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold">
                All Services
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contractor CTA — warm amber accent */}
      <section className="bg-amber-50 border-y border-amber-200">
        <div className="container py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">Are You a Licensed Contractor?</h2>
            <p className="text-slate-600 text-sm">
              Apply for a contractor account for tier pricing, net terms, and saved quotes.
            </p>
          </div>
          <Link href="/contractor">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md">
              Apply Now <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
