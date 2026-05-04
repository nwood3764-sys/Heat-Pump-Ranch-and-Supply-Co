import { CreditCard, Headphones } from "lucide-react";

const items = [
  { icon: CreditCard, title: "Financing Available", subtitle: "Options to fit your budget" },
  { icon: Headphones, title: "Expert Support", subtitle: "Product experts ready to help" },
];

export function TrustStrip() {
  return (
    <section className="bg-card border-b">
      <div className="container py-6">
        <div className="grid grid-cols-2 gap-6">
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
