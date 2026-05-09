import Link from "next/link";
import { Phone, UserPlus, HelpCircle, Briefcase } from "lucide-react";

export function UtilityBar() {
  return (
    <div className="bg-[#1e3a4a] text-white text-xs">
      <div className="container flex items-center justify-between h-9">
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-white/80">HVAC Equipment &amp; Supplies — Serving Contractors &amp; Dealers Nationwide</span>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center gap-1.5 font-semibold hover:text-[#d4a843] transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Create Account
          </Link>
          <Link href="/contractor" className="hidden sm:inline-flex items-center gap-1.5 hover:text-[#d4a843] transition-colors">
            <Briefcase className="h-3.5 w-3.5" />
            Contractor Portal
          </Link>
          <Link href="/help" className="hidden sm:inline-flex items-center gap-1.5 hover:text-[#d4a843] transition-colors">
            <HelpCircle className="h-3.5 w-3.5" />
            Help
          </Link>
          <a
            href="tel:+16088309224"
            className="flex items-center gap-1.5 font-semibold hover:text-[#d4a843] transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>608-830-9224</span>
          </a>
        </div>
      </div>
    </div>
  );
}
