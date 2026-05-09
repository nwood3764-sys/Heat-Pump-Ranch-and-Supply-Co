"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface NavDropdownProps {
  label: string;
  href: string;
  items: { label: string; href: string }[];
}

export function NavDropdown({ label, href, items }: NavDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={href}
        className="flex items-center gap-1 px-4 py-3 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 transition-colors tracking-wide"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </Link>

      {open && (
        <div className="absolute top-full left-0 bg-white shadow-lg rounded-b-md min-w-[220px] z-50 border border-slate-200">
          <ul className="py-2">
            {items.map((child) => (
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
    </div>
  );
}
