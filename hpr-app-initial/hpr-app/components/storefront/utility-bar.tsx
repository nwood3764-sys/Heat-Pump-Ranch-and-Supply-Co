import Link from "next/link";
import { Phone } from "lucide-react";

export function UtilityBar() {
  return (
    <div className="bg-primary text-primary-foreground text-xs">
      <div className="container flex items-center justify-between h-9">
        <div className="hidden sm:flex items-center gap-2">
          <span>HVAC Equipment &amp; Supplies</span>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <Link href="/contractor" className="hover:underline hidden sm:inline">
            Contractor Portal
          </Link>
          <Link href="/help" className="hover:underline hidden sm:inline">
            Help
          </Link>
          <a
            href="tel:+16088309224"
            className="flex items-center gap-1.5 font-semibold hover:underline"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>608-830-9224</span>
          </a>
        </div>
      </div>
    </div>
  );
}
