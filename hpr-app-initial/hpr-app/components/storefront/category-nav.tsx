import Link from "next/link";

const navCategories = [
  { name: "Heat Pumps", href: "/catalog?category=heat-pumps" },
  { name: "Mini Splits", href: "/catalog?category=mini-splits" },
  { name: "Air Conditioners", href: "/catalog?category=air-conditioners" },
  { name: "Furnaces", href: "/catalog?category=furnaces" },
  { name: "Air Handlers", href: "/catalog?category=air-handlers" },
  { name: "System Packages", href: "/catalog?type=systems" },
  { name: "Accessories", href: "/catalog?type=accessories" },
  { name: "Parts", href: "/catalog?type=parts" },
];

export function CategoryNav() {
  return (
    <nav className="bg-card border-b">
      <div className="container">
        <ul className="flex items-center overflow-x-auto -mx-1 scrollbar-none">
          {navCategories.map((cat) => (
            <li key={cat.href}>
              <Link
                href={cat.href}
                className="inline-block px-4 py-3 text-sm font-medium hover:text-primary whitespace-nowrap"
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
