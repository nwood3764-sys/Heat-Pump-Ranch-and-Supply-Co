import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessories | Heat Pump Ranch",
  description:
    "HVAC installation accessories — refrigerant line sets, lineset covers, equipment mounting, condensate management, electrical components, and HVAC chemicals.",
};

// ---------------------------------------------------------------------------
// Accessory sub-category tile definitions
// ---------------------------------------------------------------------------

const ACCESSORY_TILES = [
  {
    label: "Refrigerant Line Sets",
    description: "Copper line sets & insulation for mini-split and ducted systems",
    href: "/accessories/line-sets",
    image: "/tiles/accessories/line-sets.jpg",
  },
  {
    label: "Lineset Covers",
    description: "SlimDuct, SpeediChannel & decorative line hide fittings",
    href: "/accessories/lineset-covers",
    image: "/tiles/accessories/lineset-covers.png",
  },
  {
    label: "Equipment Mounting",
    description: "Condenser pads, wall brackets, ground stands & risers",
    href: "/accessories/equipment-mounting",
    image: "/tiles/accessories/equipment-mounting.jpg",
  },
  {
    label: "Condensate Management",
    description: "Condensate pumps, float switches, drain pans & treatments",
    href: "/accessories/condensate-management",
    image: "/tiles/accessories/condensate-management.jpg",
  },
  {
    label: "Electrical Components",
    description: "Electrical whips, disconnects, surge protectors & fuses",
    href: "/accessories/electrical-components",
    image: "/tiles/accessories/electrical-components.jpg",
  },
  {
    label: "HVAC Chemicals",
    description: "Coil cleaners, refrigerant leak sealants & maintenance chemicals",
    href: "/accessories/hvac-chemicals",
    image: "/tiles/accessories/hvac-chemicals.jpg",
  },
];

export default function AccessoriesPage() {
  return (
    <>
      {/* Breadcrumb / Back link */}
      <div className="container pt-4 pb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>
      </div>

      {/* Page header */}
      <section className="container pb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Accessories</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Installation accessories for residential and light-commercial HVAC
          systems. Browse by category below.
        </p>
      </section>

      {/* Tile grid — 2 cols on mobile, 3 cols on desktop */}
      <section className="container pb-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {ACCESSORY_TILES.map((tile) => (
            <div
              key={tile.href}
              className="group relative flex flex-col items-center rounded-lg border-2 border-border bg-background overflow-hidden hover:border-primary hover:shadow-md transition-all"
            >
              {/* Image area */}
              <div className="relative w-full aspect-[4/3] flex items-center justify-center bg-muted/20 p-4 md:p-6">
                <Image
                  src={tile.image}
                  alt={tile.label}
                  fill
                  className="object-contain p-4 md:p-6 group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              </div>

              {/* Label area */}
              <div className="w-full px-3 py-3 md:px-4 md:py-4 border-t bg-background text-center">
                <div className="font-bold text-sm md:text-base leading-tight">
                  {tile.label}
                </div>
                <div className="text-[11px] md:text-xs text-muted-foreground mt-1 leading-snug hidden sm:block">
                  {tile.description}
                </div>
                <div className="mt-2">
                  <span className="inline-block text-[10px] md:text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info note */}
        <div className="mt-8 rounded-lg border bg-card p-4 md:p-6 text-center">
          <p className="text-sm text-muted-foreground">
            We are currently adding accessories to our catalog. Check back soon
            for refrigerant line sets, mounting hardware, electrical components,
            and more — all at contractor-direct pricing.
          </p>
        </div>
      </section>
    </>
  );
}
