import type { Metadata } from "next";
import { Phone, Mail, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact Us | The Heat Pump Ranch & Supply Co.",
  description: "Get in touch with The Heat Pump Ranch & Supply Co. for questions about orders, products, or technical support.",
};

export default function ContactPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-muted-foreground mb-8">
        Have a question about an order, need help choosing the right system, or want to check product availability? 
        We&apos;re here to help.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Phone */}
        <Card>
          <CardContent className="p-6 flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Phone</h3>
              <a href="tel:+16088309224" className="text-lg font-medium text-primary hover:underline">
                608-830-9224
              </a>
              <p className="text-sm text-muted-foreground mt-1">
                Call or text for quick answers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardContent className="p-6 flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Email</h3>
              <a href="mailto:orders@heatpumpranch.com" className="text-lg font-medium text-primary hover:underline">
                orders@heatpumpranch.com
              </a>
              <p className="text-sm text-muted-foreground mt-1">
                For order inquiries and support
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hours */}
        <Card>
          <CardContent className="p-6 flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Business Hours</h3>
              <p className="text-sm">Monday – Friday: 8:00 AM – 5:00 PM CT</p>
              <p className="text-sm text-muted-foreground mt-1">
                Saturday – Sunday: Closed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardContent className="p-6 flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Service Area</h3>
              <p className="text-sm">Nationwide shipping across the United States</p>
              <p className="text-sm text-muted-foreground mt-1">
                Most orders ship within 1-3 business days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <div>
        <h2 className="text-xl font-bold mb-6">Common Questions</h2>
        <div className="space-y-4">
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold mb-2">How do I track my order?</h3>
            <p className="text-sm text-muted-foreground">
              You&apos;ll receive a shipping confirmation email with a tracking link once your order ships. 
              You can also check your order status anytime using the link in your confirmation email, or by 
              signing into your account.
            </p>
          </div>
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold mb-2">What if my equipment arrives damaged?</h3>
            <p className="text-sm text-muted-foreground">
              Inspect all deliveries immediately. If you notice damage, take photos and report it within 48 hours 
              using the &quot;Report Damage&quot; link in your shipping confirmation email. We&apos;ll work with you to resolve it quickly.
            </p>
          </div>
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold mb-2">Do you offer technical support for installation?</h3>
            <p className="text-sm text-muted-foreground">
              We sell equipment to licensed HVAC contractors and knowledgeable homeowners. While we can help with 
              product selection and compatibility questions, installation should be performed by a qualified technician.
            </p>
          </div>
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold mb-2">Can I return a product?</h3>
            <p className="text-sm text-muted-foreground">
              Unused, unopened equipment in original packaging may be returned within 30 days. A restocking fee may apply. 
              See our <a href="/returns" className="text-primary hover:underline">Return Policy</a> for full details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
