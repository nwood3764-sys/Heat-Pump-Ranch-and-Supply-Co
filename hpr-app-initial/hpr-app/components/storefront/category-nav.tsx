import Link from "next/link";

const navCategories = [
  { name: "Heat Pumps", href: "/catalog?system_type=ducted&equipment_type=outdoor-unit" },
  { name: "Mini Splits", href: "/catalog?system_type=non-ducted" },
  { name: "Air Conditioners", href: "/catalog?system_type=ducted&equipment_type=outdoor-unit" },
  { name: "Furnaces", href: "/catalog?system_type=ducted&equipment_type=indoor-furnace" },
  { name: "Air Handlers", href: "/catalog?system_type=ducted&equipment_type=indoor-air-handler" },
  { name: "Water Heaters", href: "/catalog?system_type=water-heater" },
  { name: "System Packages", href: "/catalog?type=systems" },
  { name: "Accessories", href: "/catalog?type=accessories" },
  { name: "Parts", href: "/catalog?type=parts" },
  { name: "Weatherization", href: "/weatherization" },
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
