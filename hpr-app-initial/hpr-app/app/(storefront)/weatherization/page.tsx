import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Package, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weatherization Materials",
  description:
    "Browse cellulose insulation and weatherization materials from Green Fiber. Eco-friendly, high-performance insulation for residential and commercial applications.",
};

// ---------------------------------------------------------------------------
// Sub-category tile definitions
// ---------------------------------------------------------------------------
const WEATHERIZATION_CATEGORIES = [
  {
    label: "Cellulose Insulation",
    description:
      "Blow-in, spray-applied, and dense-pack cellulose insulation from Green Fiber. Made with 85% recycled materials.",
    href: "/weatherization/cellulose-insulation",
    image: "/tiles/weatherization/cellulose-insulation.jpg",
  },
];

export default function WeatherizationPage() {
  return (
    <>
      {/* Page Header */}
      <section className="bg-[#2d6a7a] text-white py-10 md:py-14">
        <div className="container">
          <div className="flex items-center gap-3 mb-3">
            <Leaf className="h-8 w-8 text-[#d4a843]" />
            <h1 className="text-3xl md:text-4xl font-bold">
              Weatherization Materials
            </h1>
          </div>
          <p className="text-white/80 max-w-2xl">
            High-performance insulation and weatherization products to improve
            energy efficiency, reduce sound, and create more comfortable spaces.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="container pt-4 pb-2">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
      </div>

      {/* Sub-category tiles */}
      <section className="container py-8 md:py-12">
        <h2 className="text-xl md:text-2xl font-bold mb-6">
          Shop by Category
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WEATHERIZATION_CATEGORIES.map((cat) => (
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
                <h3 className="font-bold text-sm mb-1 group-hover:text-[#2d6a7a] transition-colors">
                  {cat.label}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {cat.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Brand Section */}
      <section className="bg-muted/30 py-10 md:py-14">
        <div className="container">
          <h2 className="text-xl md:text-2xl font-bold mb-6">
            Brands We Carry
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link
              href="/weatherization/cellulose-insulation"
              className="group flex items-center gap-6 p-6 bg-white rounded-lg border hover:border-[#2d6a7a] hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-[#7ab929]/10 flex items-center justify-center">
                <span className="font-bold text-sm text-[#7ab929] text-center leading-tight">
                  Green
                  <br />
                  Fiber
                </span>
              </div>
              <div>
                <h3 className="font-bold text-base mb-1 group-hover:text-[#2d6a7a] transition-colors">
                  Green Fiber
                </h3>
                <p className="text-sm text-muted-foreground">
                  High-performance cellulose insulation made from 85% recycled
                  materials
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto group-hover:text-[#2d6a7a] transition-colors" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-10 md:py-14 text-center">
        <h2 className="text-xl font-bold mb-3">
          Need Help Choosing the Right Insulation?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
          Contact our team for help selecting the right weatherization materials
          for your project.
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
