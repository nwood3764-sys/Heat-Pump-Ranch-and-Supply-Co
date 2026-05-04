import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | The Heat Pump Ranch & Supply Co.",
  description: "Terms and conditions for using The Heat Pump Ranch & Supply Co. website and purchasing equipment.",
};

export default function TermsPage() {
  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: May 2026</p>

      <div className="prose prose-sm max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using The Heat Pump Ranch & Supply Co. website (&quot;Site&quot;) and placing orders 
            through our platform, you agree to be bound by these Terms of Service. If you do not agree to 
            these terms, do not use the Site or make purchases.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Products and Pricing</h2>
          <p className="text-muted-foreground leading-relaxed">
            All products listed on the Site are subject to availability. Prices are displayed in US Dollars 
            and are subject to change without notice. We make every effort to ensure pricing accuracy, but 
            errors may occur. In the event of a pricing error, we reserve the right to cancel the order and 
            issue a full refund.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Orders and Payment</h2>
          <p className="text-muted-foreground leading-relaxed">
            By placing an order, you represent that you are authorized to use the payment method provided. 
            We accept ACH bank transfers and credit/debit cards (Visa, Mastercard, American Express, Discover). 
            A processing fee of 2.9% + $0.30 applies to credit card transactions. ACH payments incur no 
            additional fees. All payments are processed securely through Stripe.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Shipping and Delivery</h2>
          <p className="text-muted-foreground leading-relaxed">
            Shipping terms, delivery timeframes, and receiving instructions are detailed in our{" "}
            <a href="/shipping" className="text-primary hover:underline">Shipping Policy</a>. 
            Risk of loss and title for items pass to you upon delivery to the carrier.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Returns and Refunds</h2>
          <p className="text-muted-foreground leading-relaxed">
            Returns are subject to the terms outlined in our{" "}
            <a href="/returns" className="text-primary hover:underline">Return Policy</a>. 
            A restocking fee may apply to eligible returns.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Warranty</h2>
          <p className="text-muted-foreground leading-relaxed">
            Products sold through The Heat Pump Ranch & Supply Co. carry the manufacturer&apos;s warranty only. 
            We do not provide any additional warranty beyond what the manufacturer offers. Warranty claims 
            should be directed to the equipment manufacturer. We can assist in providing proof of purchase 
            for warranty claims.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Installation Disclaimer</h2>
          <p className="text-muted-foreground leading-relaxed">
            HVAC equipment sold through this Site should be installed by a licensed, qualified HVAC technician. 
            We are not responsible for improper installation, damage resulting from installation errors, or 
            voided warranties due to improper installation. Ensure all local codes and regulations are followed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Account Responsibility</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you create an account, you are responsible for maintaining the confidentiality of your login 
            credentials and for all activity under your account. Notify us immediately if you suspect 
            unauthorized access.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the maximum extent permitted by law, The Heat Pump Ranch & Supply Co. shall not be liable 
            for any indirect, incidental, special, or consequential damages arising from the use of our 
            Site or products purchased through it. Our total liability shall not exceed the purchase price 
            of the product(s) in question.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to update these Terms of Service at any time. Changes will be posted on 
            this page with an updated revision date. Continued use of the Site after changes constitutes 
            acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms of Service, contact us at{" "}
            <a href="mailto:orders@heatpumpranch.com" className="text-primary hover:underline">orders@heatpumpranch.com</a>
            {" "}or call{" "}
            <a href="tel:+16088309224" className="text-primary hover:underline">608-830-9224</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
