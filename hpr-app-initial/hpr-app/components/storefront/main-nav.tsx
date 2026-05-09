import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { NavDropdown } from "@/components/storefront/nav-dropdown";

const NAV_ITEMS = [
  {
    label: "PRODUCTS",
    href: "/products",
    children: [
      { label: "Heat Pumps", href: "/catalog?system_type=ducted&equipment_type=outdoor-unit" },
      { label: "Ductless Mini-Splits", href: "/catalog?system_type=non-ducted" },
      { label: "Air Conditioners", href: "/catalog?system_type=ducted&equipment_type=outdoor-unit" },
      { label: "Furnaces", href: "/catalog?system_type=ducted&equipment_type=indoor-furnace" },
      { label: "Air Handlers", href: "/catalog?system_type=ducted&equipment_type=indoor-air-handler" },
      { label: "Water Heaters", href: "/catalog?system_type=water-heater" },
      { label: "System Packages", href: "/catalog?type=systems" },
      { label: "Controls & Thermostats", href: "/catalog?product_category=accessories-parts" },
      { label: "Accessories", href: "/accessories" },
      { label: "Parts", href: "/catalog?type=parts" },
      { label: "Weatherization Materials", href: "/weatherization" },
      { label: "Shop All Products", href: "/catalog" },
    ],
  },
  {
    label: "SERVICES",
    href: "/services",
    children: [
      { label: "System Design", href: "/services#system-design" },
      { label: "Technical Support", href: "/services#technical-support" },
      { label: "Financing", href: "/services#financing" },
      { label: "Warranty Support", href: "/services#warranty" },
    ],
  },
  {
    label: "LOCATIONS",
    href: "/locations",
    children: null,
  },
  {
    label: "TRAINING AND EVENTS",
    href: "/training",
    children: [
      { label: "Upcoming Trainings", href: "/training#upcoming" },
      { label: "Training Class Recordings", href: "/training#recordings" },
    ],
  },
  {
    label: "ABOUT US",
    href: "/about",
    children: [
      { label: "Our Story", href: "/about#story" },
      { label: "Our Team", href: "/about#team" },
      { label: "Careers", href: "/about#careers" },
    ],
  },
  {
    label: "CONTACT US",
    href: "/contact",
    children: null,
  },
];

export function MainNav() {
  return (
    <nav className="bg-white border-b border-slate-200 hidden md:block">
      <div className="container">
        <ul className="flex items-center gap-0">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <li key={item.label} className="relative">
                <NavDropdown label={item.label} href={item.href} items={item.children} />
              </li>
            ) : (
              <li key={item.label} className="relative">
                <Link
                  href={item.href}
                  className="flex items-center gap-1 px-4 py-3 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 transition-colors tracking-wide"
                >
                  {item.label}
                </Link>
              </li>
            )
          )}
        </ul>
      </div>
    </nav>
  );
}
