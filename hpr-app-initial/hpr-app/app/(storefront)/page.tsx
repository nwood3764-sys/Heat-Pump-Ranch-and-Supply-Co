import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package, Wrench, MapPin, GraduationCap, ShieldCheck, Truck, HeartHandshake, Star, Zap, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      {/* Hero — compact, no giant color block */}
      <section className="container py-8 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight mb-3">
              Premium HVAC Equipment, Delivered Direct
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5">
              Residential and light-commercial heat pumps, mini-splits, and system packages from LG and ACiQ. AHRI-certified with expert support and competitive pricing for contractors and dealers.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/catalog">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Shop Products <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" variant="outline" className="border-slate-300 text-slate-700 font-medium">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
          {/* Trust badges - right side */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>AHRI Certified</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Truck className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>Nationwide Shipping</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Star className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>Top Brands</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <HeartHandshake className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>Expert Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links / Services — compact grid */}
      <section className="border-t border-slate-100">
        <div className="container py-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">What We Offer</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/catalog" className="group flex flex-col items-start p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all bg-white">
              <Package className="h-5 w-5 text-blue-600 mb-2" />
              <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">Online Store</h3>
              <p className="text-xs text-slate-500 mt-0.5">Browse catalog &amp; order 24/7</p>
            </Link>
            <Link href="/services#technical-support" className="group flex flex-col items-start p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all bg-white">
              <Wrench className="h-5 w-5 text-blue-600 mb-2" />
              <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">Technical Support</h3>
              <p className="text-xs text-slate-500 mt-0.5">Design, install &amp; troubleshoot</p>
            </Link>
            <Link href="/training" className="group flex flex-col items-start p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all bg-white">
              <GraduationCap className="h-5 w-5 text-blue-600 mb-2" />
              <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">Training</h3>
              <p className="text-xs text-slate-500 mt-0.5">Technical &amp; business training</p>
            </Link>
            <Link href="/locations" className="group flex flex-col items-start p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all bg-white">
              <MapPin className="h-5 w-5 text-blue-600 mb-2" />
              <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">Locations</h3>
              <p className="text-xs text-slate-500 mt-0.5">Nationwide coverage</p>
            </Link>
          </div>
        </div>
      </section>

      {/* About blurb — compact */}
      <section className="border-t border-slate-100">
        <div className="container py-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Who We Are</p>
            <h2 className="text-lg font-bold text-slate-900 mb-2">The Heat Pump Ranch &amp; Supply Co.</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              We are a leading distributor of heat pump equipment, parts, and accessories for residential and light-commercial applications. Serving contractors and dealers nationwide with AHRI-certified systems from LG and ACiQ at competitive pricing.
            </p>
            <Link href="/about" className="text-sm text-blue-600 hover:underline font-medium inline-flex items-center gap-1">
              Learn more <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Contractor CTA — slim bar */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="container py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Are You a Licensed Contractor?</h2>
            <p className="text-sm text-slate-500">Apply for tier pricing, net terms, and saved quotes.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/contractor">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                Apply Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
            <a href="tel:+16088309224">
              <Button size="sm" variant="outline" className="border-slate-300 text-slate-600 font-medium">
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                Call Us
              </Button>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
