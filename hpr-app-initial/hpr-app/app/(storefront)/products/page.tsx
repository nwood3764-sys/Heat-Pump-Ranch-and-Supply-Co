import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse our full catalog of heat pumps, mini-splits, water heaters, weatherization materials, accessories, and parts.",
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
  {
    label: "Weatherization Materials",
    description: "Cellulose insulation and weatherization products for energy efficiency and comfort.",
    href: "/weatherization",
    image: "/tiles/weatherization/cellulose-insulation.jpg",
  },
];

const BRANDS = [
  { name: "ACiQ", href: "/catalog?brand=ACIQ", description: "Affordable, high-efficiency heat pump systems" },
  { name: "LG", href: "/catalog?brand=LG", description: "Premium ductless and ducted solutions" },
  { name: "Green Fiber", href: "/weatherization/cellulose-insulation", description: "Eco-friendly cellulose insulation from recycled materials" },
];

export default function ProductsPage() {
  return (
    <>
      {/* Page Header - compact */}
      <section className="container pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Products</h1>
        <p className="text-sm text-slate-500 mt-1">
          Residential and light-commercial HVAC equipment, system packages, and supplies. All products are AHRI-certified with nationwide shipping.
        </p>
      </section>

      {/* Product Categories Grid */}
      <section className="container py-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Shop by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCT_CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group relative flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="relative w-full aspect-[4/3] bg-slate-50 flex items-center justify-center">
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <Package className="h-16 w-16 text-slate-300" />
                )}
              </div>
              <div className="p-3 border-t border-slate-100">
                <h3 className="font-semibold text-sm text-slate-900 mb-0.5 group-hover:text-blue-600 transition-colors">{cat.label}</h3>
                <p className="text-xs text-slate-500">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Brands Section */}
      <section className="container py-6 border-t border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Brands We Carry</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BRANDS.map((brand) => (
            <Link
              key={brand.href}
              href={brand.href}
              className="group flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-blue-50 flex items-center justify-center">
                <span className="font-bold text-base text-blue-600">{brand.name}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{brand.name}</h3>
                <p className="text-xs text-slate-500">{brand.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0 group-hover:text-blue-600 transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-8 text-center border-t border-slate-100">
        <p className="text-sm text-slate-600 mb-3">
          Can&apos;t find what you need? Contact our team for help.
        </p>
        <Link href="/contact">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            Contact Us <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      </section>
    </>
  );
}
