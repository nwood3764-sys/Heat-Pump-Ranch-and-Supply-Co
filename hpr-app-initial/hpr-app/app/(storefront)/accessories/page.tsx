import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessories | Heat Pump Ranch",
  description:
    "HVAC installation accessories — refrigerant line sets, thermostats, heat kits, equipment mounting, conversion kits, roof curbs, and more.",
};

// ---------------------------------------------------------------------------
// Accessory sub-category tile definitions
// ---------------------------------------------------------------------------

const ACCESSORY_TILES = [
  {
    label: "Line Sets & Install Kits",
    description: "Copper refrigerant line sets and mini-split installation kits",
    href: "/catalog?type=accessories&sub=line-sets",
    image: "/tiles/accessories/line-sets.jpg",
  },
  {
    label: "Thermostats & Controls",
    description: "Programmable, non-programmable, WiFi, and smart thermostats",
    href: "/catalog?type=accessories&sub=thermostats",
    image: "/tiles/accessories/thermostats.jpg",
  },
  {
    label: "Heat Kits",
    description: "Electric heat kits with circuit breakers for packaged units",
    href: "/catalog?type=accessories&sub=heat-kits",
    image: "/tiles/accessories/heat-kits.jpg",
  },
  {
    label: "Heater Coils",
    description: "Electric heater coils from 5kW to 20kW for air handlers",
    href: "/catalog?type=accessories&sub=heater-coils",
    image: "/tiles/accessories/heater-coils.jpg",
  },
  {
    label: "Equipment Mounting",
    description: "Condenser pads, wall brackets, and riser kits",
    href: "/catalog?type=accessories&sub=equipment-mounting",
    image: "/tiles/accessories/equipment-mounting.jpg",
  },
  {
    label: "Conversion Kits",
    description: "Natural gas to propane conversion kits for furnaces and packaged units",
    href: "/catalog?type=accessories&sub=conversion-kits",
    image: "/tiles/accessories/conversion-kits.jpg",
  },
  {
    label: "Roof Curbs",
    description: "Roof curbs for ACiQ and Carrier packaged units — 3 to 15 tons",
    href: "/catalog?type=accessories&sub=roof-curbs",
    image: "/tiles/accessories/roof-curbs.jpg",
  },
  {
    label: "Electrical & Wiring",
    description: "Control wire and communication cables for HVAC systems",
    href: "/catalog?type=accessories&sub=electrical",
    image: "/tiles/accessories/electrical-components.jpg",
  },
  {
    label: "Condensate Management",
    description: "Condensate pumps for mini-split air handlers",
    href: "/catalog?type=accessories&sub=condensate-management",
    image: "/tiles/accessories/condensate-management.jpg",
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
            <Link
              key={tile.href}
              href={tile.href}
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
              </div>
            </Link>
          ))}
        </div>

        {/* View All link */}
        <div className="mt-6 text-center">
          <Link
            href="/catalog?type=accessories"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            View All Accessories
          </Link>
        </div>
      </section>
    </>
  );
}
