import { Truck, Shield, CreditCard, Headphones } from "lucide-react";

const items = [
  { icon: Truck, title: "Free Shipping", subtitle: "Equipment orders over $500" },
  { icon: Shield, title: "Lowest Price Guarantee", subtitle: "We'll match any verified price" },
  { icon: CreditCard, title: "Financing Available", subtitle: "Options to fit your budget" },
  { icon: Headphones, title: "Expert Support", subtitle: "Licensed HVAC pros" },
];

export function TrustStrip() {
  return (
    <section className="bg-card border-b">
      <div className="container py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((it) => (
            <div key={it.title} className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/5 flex items-center justify-center shrink-0">
                <it.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm">{it.title}</div>
                <div className="text-xs text-muted-foreground">{it.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
