import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-white mt-0">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-bold text-lg mb-3">The Heat Pump Ranch</div>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Residential and light-commercial HVAC equipment, system packages,
              and accessories. AHRI-certified. Serving contractors and dealers nationwide.
            </p>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>Wisconsin, USA</span>
            </div>
          </div>

          {/* Products */}
          <div>
            <div className="font-semibold text-sm mb-4 text-blue-400">Products</div>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/catalog?system_type=ducted" className="hover:text-white transition-colors">Heat Pumps</Link></li>
              <li><Link href="/catalog?system_type=non-ducted" className="hover:text-white transition-colors">Mini Splits</Link></li>
              <li><Link href="/catalog?system_type=water-heater" className="hover:text-white transition-colors">Water Heaters</Link></li>
              <li><Link href="/accessories" className="hover:text-white transition-colors">Accessories</Link></li>
              <li><Link href="/catalog" className="hover:text-white transition-colors">All Products</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <div className="font-semibold text-sm mb-4 text-blue-400">Services</div>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/services" className="hover:text-white transition-colors">All Services</Link></li>
              <li><Link href="/locations" className="hover:text-white transition-colors">Locations</Link></li>
              <li><Link href="/training" className="hover:text-white transition-colors">Training</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="font-semibold text-sm mb-4 text-blue-400">Contact</div>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
                <a href="tel:+16088309224" className="hover:text-white transition-colors">608-830-9224</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
                <a href="mailto:orders@heatpumpranch.com" className="hover:text-white transition-colors">
                  orders@heatpumpranch.com
                </a>
              </li>
            </ul>
            <div className="mt-4 text-xs text-slate-500">
              Mon – Fri: 8am – 5pm CT
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>&copy; {new Date().getFullYear()} The Heat Pump Ranch &amp; Supply Co. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/shipping" className="hover:text-white transition-colors">Shipping</Link>
            <Link href="/returns" className="hover:text-white transition-colors">Returns</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
