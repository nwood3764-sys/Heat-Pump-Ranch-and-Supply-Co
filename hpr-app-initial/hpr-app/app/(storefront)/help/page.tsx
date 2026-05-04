import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Help & FAQ" };

export default function HelpPage() {
  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Help &amp; FAQ</h1>
      <p className="text-muted-foreground mb-8">
        Common questions about ordering, shipping, and installation. Don&apos;t see what you need?
        Call us at <a href="tel:+16088309224" className="text-primary font-semibold">608-830-9224</a>.
      </p>

      <section id="shipping" className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Shipping &amp; Freight</h2>
        <Card>
          <CardContent className="p-5 space-y-3">
            <div>
              <div className="font-semibold mb-1">Equipment ships LTL freight</div>
              <p className="text-sm text-muted-foreground">
                Condensers, air handlers, furnaces, and system packages ship via LTL freight on a
                pallet. Curbside delivery is included; you&apos;re responsible for unloading and
                moving equipment to its final location.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">Freight quotes</div>
              <p className="text-sm text-muted-foreground">
                Freight rates depend on destination, equipment weight, and accessorials (lift gate,
                residential delivery). At checkout you&apos;ll request a freight quote — we&apos;ll
                respond within one business day with the exact cost before charging.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">Shipping</div>
              <p className="text-sm text-muted-foreground">
                Shipping costs are calculated at checkout based on your location and order size.
                Alaska, Hawaii, and Canada are quoted separately.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="returns" className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Returns</h2>
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Equipment must be returned in original packaging within 30 days. Refrigerant-charged
              units cannot be returned once opened. Restocking fees may apply on installed
              equipment. Call to start a return — we&apos;ll send the RMA paperwork.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="installation" className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Installation</h2>
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              We sell to homeowners, contractors, and dealers. Most heat pump and AC systems
              require an EPA 608 certified technician for refrigerant work and a permit for
              electrical and gas connections. Mini split DIY kits with pre-charged linesets are
              the exception.
            </p>
            <p className="text-sm text-muted-foreground">
              Check your manufacturer&apos;s warranty — some require professional installation for
              the warranty to remain valid.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="warranty" className="space-y-4">
        <h2 className="text-xl font-bold">Warranty</h2>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Equipment warranties are honored by the manufacturer (LG, ACiQ). We facilitate
              warranty claims — call us with the model and serial number and we&apos;ll handle
              the paperwork.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
