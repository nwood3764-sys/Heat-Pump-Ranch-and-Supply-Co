import Link from "next/link";
import { Phone, Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-card border-t mt-16">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="font-bold text-base mb-3">The Heat Pump Ranch</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Residential and light-commercial HVAC equipment, system packages,
              and accessories. AHRI-certified.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm mb-3">Shop</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/catalog?category=heat-pumps" className="hover:text-foreground">Heat Pumps</Link></li>
              <li><Link href="/catalog?category=mini-splits" className="hover:text-foreground">Mini Splits</Link></li>
              <li><Link href="/catalog?type=systems" className="hover:text-foreground">System Packages</Link></li>
              <li><Link href="/catalog?type=accessories" className="hover:text-foreground">Accessories</Link></li>
              <li><Link href="/catalog" className="hover:text-foreground">All Products</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-sm mb-3">Customer Service</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/contact" className="hover:text-foreground">Contact Us</Link></li>
              <li><Link href="/shipping" className="hover:text-foreground">Shipping Policy</Link></li>
              <li><Link href="/returns" className="hover:text-foreground">Returns &amp; Refunds</Link></li>
              <li><Link href="/account" className="hover:text-foreground">My Account</Link></li>
              <li><Link href="/contractor" className="hover:text-foreground">Contractor Portal</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-sm mb-3">Contact</div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <a href="tel:+16088309224" className="hover:text-foreground">608-830-9224</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <a href="mailto:orders@heatpumpranch.com" className="hover:text-foreground">
                  orders@heatpumpranch.com
                </a>
              </li>
            </ul>
            <div className="mt-4 text-xs text-muted-foreground">
              Mon – Fri: 8am – 5pm CT
            </div>
          </div>
        </div>

        <div className="border-t mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>&copy; {new Date().getFullYear()} The Heat Pump Ranch &amp; Supply Co. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link href="/shipping" className="hover:text-foreground">Shipping</Link>
            <Link href="/returns" className="hover:text-foreground">Returns</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
