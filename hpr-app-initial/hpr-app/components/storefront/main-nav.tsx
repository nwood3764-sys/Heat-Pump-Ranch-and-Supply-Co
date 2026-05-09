"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

const NAV_ITEMS = [
  {
    label: "PRODUCTS",
    href: "/products",
    children: [
      { label: "Heat Pumps", href: "/catalog?system_type=ducted" },
      { label: "Ductless Mini-Splits", href: "/catalog?system_type=non-ducted" },
      { label: "Water Heaters", href: "/catalog?system_type=water-heater" },
      { label: "Accessories", href: "/accessories" },
      { label: "Parts", href: "/catalog?type=parts" },
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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <nav className="bg-white border-b border-slate-200 hidden md:block">
      <div className="container">
        <ul className="flex items-center gap-0">
          {NAV_ITEMS.map((item) => (
            <li
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && setOpenDropdown(item.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                href={item.href}
                className="flex items-center gap-1 px-4 py-3 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 transition-colors tracking-wide"
              >
                {item.label}
                {item.children && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
              </Link>

              {/* Dropdown */}
              {item.children && openDropdown === item.label && (
                <div className="absolute top-full left-0 bg-white shadow-lg rounded-b-md min-w-[220px] z-50 border border-slate-200">
                  <ul className="py-2">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
