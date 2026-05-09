import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, Phone, CheckCircle2, Shield, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import {
  GREEN_FIBER_PRODUCTS,
  getProductBySlug,
} from "@/lib/weatherization-products";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}): Promise<Metadata> {
  const { productSlug } = await params;
  const product = getProductBySlug(productSlug);
  if (!product) return { title: "Not Found" };
  return {
    title: `${product.title} — Cellulose Insulation`,
    description: product.shortDescription,
  };
}

export function generateStaticParams() {
  return GREEN_FIBER_PRODUCTS.map((p) => ({ productSlug: p.slug }));
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function WeatherizationProductDetailPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;
  const product = getProductBySlug(productSlug);
  if (!product) notFound();

  const specEntries = Object.entries(product.specs);

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
        <Link
          href="/weatherization"
          className="hover:text-primary inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Weatherization
        </Link>
        <span>/</span>
        <Link
          href="/weatherization/cellulose-insulation"
          className="hover:text-primary"
        >
          Cellulose Insulation
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.title}</span>
      </div>

      {/* Main product layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div>
          <div className="aspect-square border rounded-md bg-muted/20 flex items-center justify-center p-8 mb-3 overflow-hidden">
            {product.thumbnailUrl ? (
              <Image
                src={product.thumbnailUrl}
                alt={product.title}
                width={600}
                height={600}
                className="max-h-full max-w-full object-contain"
                priority
              />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground/30" />
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {product.brand}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2">
            {product.title}
          </h1>

          {/* Quick specs badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2d6a7a]/10 text-[#2d6a7a] text-xs font-medium">
              {product.bagSize}
            </span>
            {product.rValuePerInch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2d6a7a]/10 text-[#2d6a7a] text-xs font-medium">
                R-{product.rValuePerInch}/inch
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2d6a7a]/10 text-[#2d6a7a] text-xs font-medium">
              {product.insulationType}
            </span>
          </div>

          {/* Pricing section */}
          <div className="border-y py-4 mb-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-lg font-bold text-foreground">
                  Call for Contractor Pricing
                </div>
                <div className="text-sm text-muted-foreground">
                  Contact us at{" "}
                  <a
                    href="tel:+16088309224"
                    className="text-[#2d6a7a] hover:underline font-medium"
                  >
                    608-830-9224
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact button */}
          <div className="flex gap-2 mb-6">
            <Link href="/contact" className="flex-1">
              <Button
                size="lg"
                className="w-full bg-[#2d6a7a] hover:bg-[#245a68] font-semibold"
              >
                <Phone className="h-4 w-4 mr-2" />
                Contact for Pricing
              </Button>
            </Link>
          </div>

          {/* Short description */}
          <p className="text-sm leading-relaxed mb-4 text-foreground/80">
            {product.shortDescription}
          </p>

          {/* Note */}
          {product.note && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> {product.note}
              </p>
            </div>
          )}

          {/* Applications */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Applications</h3>
            <div className="flex flex-wrap gap-2">
              {product.applications.map((app) => (
                <span
                  key={app}
                  className="px-3 py-1 rounded-md border text-xs font-medium bg-card"
                >
                  {app}
                </span>
              ))}
            </div>
          </div>

          {/* Certifications */}
          {product.certifications.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Certifications</h3>
              <div className="flex flex-wrap gap-2">
                {product.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200"
                  >
                    <Shield className="h-3 w-3" />
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features section */}
      <section className="mt-12 border-t pt-8">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Leaf className="h-5 w-5 text-[#7ab929]" />
          Product Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {product.features.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-3 p-4 rounded-lg border bg-card"
            >
              <CheckCircle2 className="h-5 w-5 text-[#7ab929] flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Full description */}
      <section className="mt-12 border-t pt-8">
        <h2 className="text-xl font-bold mb-4">Description</h2>
        <div className="max-w-3xl">
          <p className="text-sm leading-relaxed text-foreground/85">
            {product.description}
          </p>
        </div>
      </section>

      {/* Specifications table */}
      <section className="mt-12 border-t pt-8">
        <h2 className="text-xl font-bold mb-4">Specifications</h2>
        <div className="max-w-3xl border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {specEntries.map(([key, value], i) => (
                <tr
                  key={key}
                  className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                >
                  <th className="text-left font-medium px-3 py-2.5 w-1/2 align-top">
                    {key}
                  </th>
                  <td className="px-3 py-2.5 text-foreground/85">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Coverage chart for Agritherm */}
      {product.slug === "agritherm-insulation" && (
        <section className="mt-12 border-t pt-8">
          <h2 className="text-xl font-bold mb-4">Coverage Chart</h2>
          <div className="max-w-3xl border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#2d6a7a] text-white">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium">R-Value</th>
                  <th className="text-left px-3 py-2.5 font-medium">
                    Installed Thickness
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium">
                    Coverage per Bag (sq ft)
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium">
                    Bags per 1,000 sq ft
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { r: "R-13", thick: '3.71"', cov: "74.1", bags: "13.5" },
                  { r: "R-19", thick: '5.42"', cov: "50.7", bags: "19.7" },
                  { r: "R-22", thick: '6.27"', cov: "43.7", bags: "22.8" },
                  { r: "R-24", thick: '6.95"', cov: "39.4", bags: "25.4" },
                  { r: "R-30", thick: '8.69"', cov: "31.5", bags: "31.7" },
                  { r: "R-32", thick: '9.27"', cov: "29.6", bags: "33.9" },
                  { r: "R-38", thick: '11.18"', cov: "24.2", bags: "41.4" },
                  { r: "R-40", thick: '11.76"', cov: "23.0", bags: "43.5" },
                  { r: "R-49", thick: '14.41"', cov: "18.8", bags: "53.3" },
                  { r: "R-50", thick: '14.71"', cov: "18.4", bags: "54.4" },
                ].map((row, i) => (
                  <tr
                    key={row.r}
                    className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                  >
                    <td className="px-3 py-2 font-medium">{row.r}</td>
                    <td className="px-3 py-2">{row.thick}</td>
                    <td className="px-3 py-2">{row.cov}</td>
                    <td className="px-3 py-2">{row.bags}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mt-12 border-t pt-8 text-center">
        <h2 className="text-lg font-bold mb-3">
          Ready to Order?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto text-sm">
          Contact our team for contractor pricing, bulk orders, and delivery
          options.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/contact">
            <Button className="bg-[#2d6a7a] hover:bg-[#245a68] font-semibold">
              <Phone className="h-4 w-4 mr-2" />
              Contact Us
            </Button>
          </Link>
          <Link href="/weatherization/cellulose-insulation">
            <Button variant="outline">View All Insulation</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
