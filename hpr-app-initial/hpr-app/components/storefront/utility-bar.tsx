import Link from "next/link";
import { Phone, UserPlus } from "lucide-react";

export function UtilityBar() {
  return (
    <div className="bg-primary text-primary-foreground text-xs">
      <div className="container flex items-center justify-between h-9">
        <div className="hidden sm:flex items-center gap-2">
          <span>HVAC Equipment &amp; Supplies for Contractors &amp; Dealers</span>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center gap-1.5 font-semibold hover:underline"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Create Account
          </Link>
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
