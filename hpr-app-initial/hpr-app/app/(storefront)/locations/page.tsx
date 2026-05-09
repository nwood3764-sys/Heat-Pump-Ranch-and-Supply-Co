import Link from "next/link";
import { MapPin, Phone, Mail, Clock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Locations",
  description: "Find our service areas and distribution coverage. Nationwide shipping available.",
};

export default function LocationsPage() {
  return (
    <>
      {/* Page Header - compact */}
      <section className="container pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Locations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Serving contractors and dealers nationwide with fast shipping and expert support.
        </p>
      </section>

      {/* Main Location */}
      <section className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Location Info */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Headquarters &amp; Distribution Center</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-slate-900">Address</h3>
                  <p className="text-sm text-slate-500">Wisconsin, United States</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-slate-900">Phone</h3>
                  <a href="tel:+16088309224" className="text-sm text-blue-600 hover:underline">
                    608-830-9224
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-slate-900">Email</h3>
                  <a href="mailto:orders@heatpumpranch.com" className="text-sm text-blue-600 hover:underline">
                    orders@heatpumpranch.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-slate-900">Business Hours</h3>
                  <p className="text-sm text-slate-500">Monday – Friday: 8:00 AM – 5:00 PM CT</p>
                  <p className="text-sm text-slate-500">Saturday – Sunday: Closed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center min-h-[250px]">
            <div className="text-center p-6">
              <MapPin className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Map coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Area */}
      <section className="container py-6 border-t border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Nationwide Shipping</h2>
        <p className="text-sm text-slate-500 mb-4 max-w-2xl">
          We ship equipment and parts to contractors and dealers across the United States. Most orders ship within 1-3 business days.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <Truck className="h-5 w-5 text-blue-600 mb-2" />
            <h3 className="font-semibold text-sm text-slate-900 mb-1">Fast Shipping</h3>
            <p className="text-xs text-slate-500">Most orders ship within 1-3 business days from our distribution center.</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <MapPin className="h-5 w-5 text-blue-600 mb-2" />
            <h3 className="font-semibold text-sm text-slate-900 mb-1">Nationwide Coverage</h3>
            <p className="text-xs text-slate-500">We serve contractors and dealers in all 50 states with reliable freight partners.</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <Phone className="h-5 w-5 text-blue-600 mb-2" />
            <h3 className="font-semibold text-sm text-slate-900 mb-1">Local Support</h3>
            <p className="text-xs text-slate-500">Our Wisconsin-based team provides personalized support for every order.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-8 border-t border-slate-100">
        <p className="text-sm text-slate-600 mb-3">
          Questions about shipping or coverage? Contact us to learn about delivery options in your area.
        </p>
        <Link href="/contact">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            Contact Us
          </Button>
        </Link>
      </section>
    </>
  );
}
