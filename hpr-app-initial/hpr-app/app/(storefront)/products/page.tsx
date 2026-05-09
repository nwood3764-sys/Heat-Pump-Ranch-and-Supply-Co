import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse our full catalog of heat pumps, mini-splits, water heaters, accessories, and parts.",
};

const PRODUCT_CATEGORIES = [
  {
    label: "Ducted Heat Pump Systems",
    description: "Central heat pumps, air handlers, coils & furnaces for whole-home comfort.",
    href: "/catalog?system_type=ducted",
    image: "/tiles/ducted-system.jpg",
  },
  {
    label: "Ductless Mini-Split Systems",
    description: "Wall mount, ceiling cassette, floor mount & concealed duct units.",
    href: "/catalog?system_type=non-ducted",
    image: "/tiles/ductless-system.jpg",
  },
  {
    label: "Water Heaters",
    description: "Heat pump water heaters for efficient, cost-effective hot water.",
    href: "/catalog?system_type=water-heater",
    image: null,
  },
  {
    label: "Controls & Thermostats",
    description: "Smart thermostats, sensors & system controls for precise climate management.",
    href: "/catalog?product_category=accessories-parts",
    image: "/tiles/controls-thermostats.png",
  },
  {
    label: "Accessories",
    description: "Line sets, mounting brackets, pads & installation supplies.",
    href: "/accessories",
    image: "/tiles/accessories.jpg",
  },
  {
    label: "Parts",
    description: "Replacement compressors, capacitors & components.",
    href: "/catalog?type=parts",
    image: "/tiles/parts.jpg",
  },
];

const BRANDS = [
  { name: "ACiQ", href: "/catalog?brand=ACIQ", description: "Affordable, high-efficiency heat pump systems" },
  { name: "LG", href: "/catalog?brand=LG", description: "Premium ductless and ducted solutions" },
];

export default function ProductsPage() {
  return (
    <>
      {/* Page Header */}
      <section className="bg-[#2d6a7a] text-white py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Products</h1>
          <p className="text-white/80 max-w-2xl">
            Residential and light-commercial HVAC equipment, system packages, and supplies. All products are AHRI-certified with nationwide shipping.
          </p>
        </div>
      </section>

      {/* Product Categories Grid */}
      <section className="container py-10 md:py-14">
        <h2 className="text-xl md:text-2xl font-bold mb-6">Shop by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCT_CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group relative flex flex-col rounded-lg border bg-card overflow-hidden hover:border-[#2d6a7a] hover:shadow-lg transition-all"
            >
              <div className="relative w-full aspect-[4/3] bg-muted/20 flex items-center justify-center">
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <Package className="h-16 w-16 text-muted-foreground/30" />
                )}
              </div>
              <div className="p-4 border-t">
                <h3 className="font-bold text-sm mb-1 group-hover:text-[#2d6a7a] transition-colors">{cat.label}</h3>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Brands Section */}
      <section className="bg-muted/30 py-10 md:py-14">
        <div className="container">
          <h2 className="text-xl md:text-2xl font-bold mb-6">Brands We Carry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {BRANDS.map((brand) => (
              <Link
                key={brand.href}
                href={brand.href}
                className="group flex items-center gap-6 p-6 bg-white rounded-lg border hover:border-[#2d6a7a] hover:shadow-md transition-all"
              >
                <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-[#2d6a7a]/10 flex items-center justify-center">
                  <span className="font-bold text-xl text-[#2d6a7a]">{brand.name}</span>
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1 group-hover:text-[#2d6a7a] transition-colors">{brand.name}</h3>
                  <p className="text-sm text-muted-foreground">{brand.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto group-hover:text-[#2d6a7a] transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-10 md:py-14 text-center">
        <h2 className="text-xl font-bold mb-3">Can&apos;t Find What You Need?</h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
          Contact our team for help finding the right equipment for your project.
        </p>
        <Link href="/contact">
          <Button className="bg-[#2d6a7a] hover:bg-[#245a68] font-semibold">
            Contact Us <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </section>
    </>
  );
}
