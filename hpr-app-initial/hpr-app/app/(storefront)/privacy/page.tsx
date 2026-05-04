import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | The Heat Pump Ranch & Supply Co.",
  description: "How we collect, use, and protect your personal information at The Heat Pump Ranch & Supply Co.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: May 2026</p>

      <div className="prose prose-sm max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            When you use our Site or place an order, we may collect the following information:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span><strong>Contact information:</strong> Name, email address, phone number</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span><strong>Shipping information:</strong> Delivery address</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span><strong>Payment information:</strong> Processed securely through Stripe (we do not store card numbers)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span><strong>Account information:</strong> Email and password (if you create an account)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span><strong>Usage data:</strong> Pages visited, products viewed, browser type, and device information</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We use the information we collect to:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Process and fulfill your orders</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Send order confirmations, shipping updates, and delivery notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Respond to your questions and support requests</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Improve our website and product offerings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Prevent fraud and maintain security</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Information Sharing</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell, rent, or trade your personal information to third parties. We may share your 
            information with trusted service providers who assist in operating our business:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground mt-3">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span><strong>Stripe:</strong> Payment processing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span><strong>Freight carriers:</strong> Shipping and delivery (name, address, phone for delivery coordination)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span><strong>Email services:</strong> Transactional email delivery (order confirmations, shipping notifications)</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement industry-standard security measures to protect your personal information. Payment 
            data is encrypted and processed through Stripe&apos;s PCI-compliant infrastructure. We never store 
            credit card numbers on our servers. Account passwords are hashed and cannot be viewed by our staff.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use essential cookies to maintain your shopping cart and login session. We may use analytics 
            cookies to understand how visitors use our Site. You can disable cookies in your browser settings, 
            but some Site features may not function properly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may request access to, correction of, or deletion of your personal information at any time 
            by contacting us. If you have an account, you can update your profile information directly through 
            the account settings page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Children&apos;s Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our Site is not intended for children under 18. We do not knowingly collect personal information 
            from minors.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an 
            updated revision date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For privacy-related questions or requests, contact us at{" "}
            <a href="mailto:orders@heatpumpranch.com" className="text-primary hover:underline">orders@heatpumpranch.com</a>
            {" "}or call{" "}
            <a href="tel:+16088309224" className="text-primary hover:underline">608-830-9224</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
