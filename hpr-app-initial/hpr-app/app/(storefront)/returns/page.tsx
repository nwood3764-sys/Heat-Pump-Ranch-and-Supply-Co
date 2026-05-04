import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return Policy | The Heat Pump Ranch & Supply Co.",
  description: "Return and refund policy for HVAC equipment purchased from The Heat Pump Ranch & Supply Co.",
};

export default function ReturnPolicyPage() {
  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Return Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: May 2026</p>

      <div className="prose prose-sm max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-3">Return Eligibility</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We accept returns on unused, unopened equipment in its original packaging within 30 days of delivery. 
            To be eligible for a return:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Equipment must be unused and in original, undamaged packaging</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>All original accessories, manuals, and warranty cards must be included</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Return must be requested within 30 days of delivery</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Equipment must not have been installed, connected to refrigerant lines, or powered on</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Restocking Fee</h2>
          <p className="text-muted-foreground leading-relaxed">
            A restocking fee of 15-25% may apply depending on the product and condition. This covers 
            inspection, repackaging, and return freight costs. The exact restocking fee will be communicated 
            before the return is processed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Damaged or Defective Equipment</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            If your equipment arrives damaged or is defective:
          </p>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Take photos of the damage immediately upon delivery</li>
            <li>Note any damage on the freight carrier&apos;s delivery receipt</li>
            <li>Report the damage within 48 hours using the link in your shipping confirmation email</li>
            <li>Do not discard any packaging materials until the claim is resolved</li>
          </ol>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Damaged shipments are handled through a freight claim process. We will work with you and the 
            carrier to resolve the issue — either through replacement or refund at no cost to you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Non-Returnable Items</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            The following items cannot be returned:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Equipment that has been installed or connected to refrigerant</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Custom-ordered or special-order items</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Items returned after 30 days</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Equipment with missing or damaged packaging that cannot be resold</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Return Shipping</h2>
          <p className="text-muted-foreground leading-relaxed">
            Return shipping costs are the responsibility of the buyer unless the return is due to our error 
            or a defective product. We can arrange return freight pickup for your convenience — the cost will 
            be deducted from your refund.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Refund Process</h2>
          <p className="text-muted-foreground leading-relaxed">
            Once we receive and inspect the returned equipment, your refund will be processed within 5-7 
            business days. Refunds are issued to the original payment method. Credit card refunds may take 
            an additional 3-5 business days to appear on your statement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">How to Start a Return</h2>
          <p className="text-muted-foreground leading-relaxed">
            To initiate a return, use the &quot;Report Damage / Request Return&quot; link in your shipping 
            confirmation email, or contact us at{" "}
            <a href="mailto:orders@heatpumpranch.com" className="text-primary hover:underline">orders@heatpumpranch.com</a>
            {" "}with your order number.
          </p>
        </section>
      </div>
    </div>
  );
}
