import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy | The Heat Pump Ranch & Supply Co.",
  description: "Shipping information, delivery timeframes, and freight handling for HVAC equipment orders.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Shipping Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: May 2026</p>

      <div className="prose prose-sm max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-3">Processing Time</h2>
          <p className="text-muted-foreground leading-relaxed">
            Orders are processed within 1-3 business days after payment is confirmed. ACH bank transfers 
            typically take 1-4 business days to clear before processing begins. You will receive a shipping 
            confirmation email with tracking information once your order ships.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Shipping Methods</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Due to the size and weight of HVAC equipment, most orders ship via freight carrier (LTL) or 
            parcel service depending on the product:
          </p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Product Type</th>
                  <th className="text-left p-3 font-medium">Typical Shipping Method</th>
                  <th className="text-left p-3 font-medium">Estimated Transit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3">Outdoor units, air handlers</td>
                  <td className="p-3">LTL Freight</td>
                  <td className="p-3">5-10 business days</td>
                </tr>
                <tr>
                  <td className="p-3">Mini-split systems</td>
                  <td className="p-3">Freight or Parcel</td>
                  <td className="p-3">3-7 business days</td>
                </tr>
                <tr>
                  <td className="p-3">Accessories, line sets</td>
                  <td className="p-3">UPS / FedEx</td>
                  <td className="p-3">3-5 business days</td>
                </tr>
                <tr>
                  <td className="p-3">Water heaters</td>
                  <td className="p-3">LTL Freight</td>
                  <td className="p-3">5-10 business days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Delivery Area</h2>
          <p className="text-muted-foreground leading-relaxed">
            We ship to all 50 United States. Freight deliveries are curbside or dock delivery unless 
            otherwise arranged. Liftgate service may be available for an additional charge — contact us 
            before ordering if you need liftgate delivery.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Receiving Your Delivery</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium mb-2">Important: Inspect Before Signing</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              When your freight delivery arrives, inspect all packaging for visible damage before signing 
              the delivery receipt. If you see damage, note it on the receipt and take photos immediately. 
              Report any damage within 48 hours using the link in your shipping confirmation email.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Shipping Costs</h2>
          <p className="text-muted-foreground leading-relaxed">
            Shipping costs are calculated at checkout based on product weight, dimensions, and destination. 
            For large freight orders, a shipping quote will be provided during the checkout process.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Questions?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Contact us at{" "}
            <a href="tel:+16088309224" className="text-primary hover:underline">608-830-9224</a> or{" "}
            <a href="mailto:orders@heatpumpranch.com" className="text-primary hover:underline">orders@heatpumpranch.com</a>
            {" "}for shipping questions or to request a freight quote.
          </p>
        </section>
      </div>
    </div>
  );
}
