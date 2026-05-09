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
      {/* Page Header */}
      <section className="bg-[#2d6a7a] text-white py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Locations</h1>
          <p className="text-white/80 max-w-2xl">
            Serving contractors and dealers nationwide with fast shipping and expert support.
          </p>
        </div>
      </section>

      {/* Main Location */}
      <section className="container py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Location Info */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-6">Headquarters &amp; Distribution Center</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#2d6a7a]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-[#2d6a7a]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Address</h3>
                  <p className="text-muted-foreground text-sm">
                    Wisconsin, United States
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#2d6a7a]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-[#2d6a7a]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Phone</h3>
                  <a href="tel:+16088309224" className="text-[#2d6a7a] hover:underline text-sm font-medium">
                    608-830-9224
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#2d6a7a]/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-[#2d6a7a]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Email</h3>
                  <a href="mailto:orders@heatpumpranch.com" className="text-[#2d6a7a] hover:underline text-sm font-medium">
                    orders@heatpumpranch.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#2d6a7a]/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-[#2d6a7a]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Business Hours</h3>
                  <p className="text-muted-foreground text-sm">Monday – Friday: 8:00 AM – 5:00 PM CT</p>
                  <p className="text-muted-foreground text-sm">Saturday – Sunday: Closed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="bg-muted/30 rounded-lg border flex items-center justify-center min-h-[300px]">
            <div className="text-center p-8">
              <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Map coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Area */}
      <section className="bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-3">Nationwide Shipping</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We ship equipment and parts to contractors and dealers across the United States. Most orders ship within 1-3 business days.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border p-6 text-center">
              <Truck className="h-8 w-8 text-[#2d6a7a] mx-auto mb-3" />
              <h3 className="font-bold text-sm mb-2">Fast Shipping</h3>
              <p className="text-xs text-muted-foreground">Most orders ship within 1-3 business days from our distribution center.</p>
            </div>
            <div className="bg-white rounded-lg border p-6 text-center">
              <MapPin className="h-8 w-8 text-[#2d6a7a] mx-auto mb-3" />
              <h3 className="font-bold text-sm mb-2">Nationwide Coverage</h3>
              <p className="text-xs text-muted-foreground">We serve contractors and dealers in all 50 states with reliable freight partners.</p>
            </div>
            <div className="bg-white rounded-lg border p-6 text-center">
              <Phone className="h-8 w-8 text-[#2d6a7a] mx-auto mb-3" />
              <h3 className="font-bold text-sm mb-2">Local Support</h3>
              <p className="text-xs text-muted-foreground">Our Wisconsin-based team provides personalized support for every order.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-10 md:py-14 text-center">
        <h2 className="text-xl font-bold mb-3">Questions About Shipping or Coverage?</h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
          Contact us to learn about shipping options, delivery times, and service in your area.
        </p>
        <Link href="/contact">
          <Button className="bg-[#2d6a7a] hover:bg-[#245a68] font-semibold">
            Contact Us
          </Button>
        </Link>
      </section>
    </>
  );
}
