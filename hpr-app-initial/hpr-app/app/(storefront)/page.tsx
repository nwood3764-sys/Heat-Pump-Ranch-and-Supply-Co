import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package, Wrench, MapPin, GraduationCap, ShieldCheck, Truck, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-[#1e3a4a] text-white overflow-hidden">
        {/* Background pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }} />
        </div>

        <div className="container relative py-16 md:py-24 lg:py-32">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
              <span className="text-[#d4a843]">Your Partner in</span>
              <br />
              Heat Pump Solutions
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-4 max-w-2xl">
              Residential and light-commercial HVAC equipment, expert support, and competitive pricing for contractors and dealers.
            </p>
            <p className="text-sm md:text-base text-white/60 mb-8 max-w-2xl">
              The Heat Pump Ranch &amp; Supply Co. is committed to making the heat pump transition easy. From product selection to technical support, we&apos;re here to help you grow your business.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/catalog">
                <Button size="lg" className="bg-[#d4a843] hover:bg-[#c09935] text-[#1e3a4a] font-bold">
                  Shop Products
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Three Value Proposition Cards */}
      <section className="bg-[#2d6a7a] py-12 md:py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Card 1 */}
            <div className="text-center text-white px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#d4a843]/20 border-2 border-[#d4a843] mb-4">
                <ShieldCheck className="h-8 w-8 text-[#d4a843]" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-[#d4a843]">MAKING IT EASY</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                As an extension of your team, we ensure you have the equipment and parts you need. Focused on making things easier, we help streamline your business with hands-on support and cutting-edge resources.
              </p>
            </div>

            {/* Card 2 */}
            <div className="text-center text-white px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#d4a843]/20 border-2 border-[#d4a843] mb-4">
                <Truck className="h-8 w-8 text-[#d4a843]" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-[#d4a843]">SETTING A NEW STANDARD</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                We go above and beyond the traditional role of an HVAC distributor to provide innovative solutions you need to grow and be more profitable. The right mix of services, expertise, and products — when and where you need them.
              </p>
            </div>

            {/* Card 3 */}
            <div className="text-center text-white px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#d4a843]/20 border-2 border-[#d4a843] mb-4">
                <HeartHandshake className="h-8 w-8 text-[#d4a843]" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-[#d4a843]">FOR US, IT&apos;S PERSONAL</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Our commitment is rooted in integrity, trust, and building relationships. We push ourselves to go further to put you in the best position to succeed. For us, it&apos;s not just business — it&apos;s personal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-semibold text-[#2d6a7a] uppercase tracking-wider mb-2">Who We Are</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">The Heat Pump Ranch &amp; Supply Co.</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              We are a leading distributor of heat pump equipment, parts, and accessories for residential and light-commercial applications. Serving contractors and dealers nationwide, we provide AHRI-certified systems from top brands like LG and ACiQ at competitive pricing.
            </p>
            <Link href="/about">
              <Button variant="outline" className="border-[#2d6a7a] text-[#2d6a7a] hover:bg-[#2d6a7a] hover:text-white font-semibold">
                About Us
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Our Services Section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Our Services</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We take pride in providing innovative ways to add value and help you grow your business.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Service Card 1 */}
            <Link href="/catalog" className="group bg-white rounded-lg border shadow-sm hover:shadow-md hover:border-[#2d6a7a] transition-all p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#2d6a7a]/10 mb-4 group-hover:bg-[#2d6a7a]/20 transition-colors">
                <Package className="h-6 w-6 text-[#2d6a7a]" />
              </div>
              <h3 className="font-bold text-sm mb-2">Online Store</h3>
              <p className="text-xs text-muted-foreground">Browse our full catalog, check inventory, and place orders online 24/7.</p>
            </Link>

            {/* Service Card 2 */}
            <Link href="/services#technical-support" className="group bg-white rounded-lg border shadow-sm hover:shadow-md hover:border-[#2d6a7a] transition-all p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#2d6a7a]/10 mb-4 group-hover:bg-[#2d6a7a]/20 transition-colors">
                <Wrench className="h-6 w-6 text-[#2d6a7a]" />
              </div>
              <h3 className="font-bold text-sm mb-2">Technical Support</h3>
              <p className="text-xs text-muted-foreground">Expert guidance on system design, installation, and troubleshooting.</p>
            </Link>

            {/* Service Card 3 */}
            <Link href="/training" className="group bg-white rounded-lg border shadow-sm hover:shadow-md hover:border-[#2d6a7a] transition-all p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#2d6a7a]/10 mb-4 group-hover:bg-[#2d6a7a]/20 transition-colors">
                <GraduationCap className="h-6 w-6 text-[#2d6a7a]" />
              </div>
              <h3 className="font-bold text-sm mb-2">Training</h3>
              <p className="text-xs text-muted-foreground">Technical, service, and business training opportunities for your team.</p>
            </Link>

            {/* Service Card 4 */}
            <Link href="/locations" className="group bg-white rounded-lg border shadow-sm hover:shadow-md hover:border-[#2d6a7a] transition-all p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#2d6a7a]/10 mb-4 group-hover:bg-[#2d6a7a]/20 transition-colors">
                <MapPin className="h-6 w-6 text-[#2d6a7a]" />
              </div>
              <h3 className="font-bold text-sm mb-2">Locations</h3>
              <p className="text-xs text-muted-foreground">Find our service areas and distribution coverage across the nation.</p>
            </Link>
          </div>

          <div className="text-center mt-8">
            <Link href="/services">
              <Button variant="outline" className="border-[#d4a843] text-[#d4a843] hover:bg-[#d4a843] hover:text-white font-semibold">
                All Services
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contractor CTA */}
      <section className="bg-[#d4a843] text-[#1e3a4a]">
        <div className="container py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-1">Are You a Licensed Contractor?</h2>
            <p className="text-[#1e3a4a]/70 text-sm">
              Apply for a contractor account for tier pricing, net terms, and saved quotes.
            </p>
          </div>
          <Link href="/contractor">
            <Button size="lg" className="bg-[#1e3a4a] hover:bg-[#2d6a7a] text-white font-semibold">
              Apply Now <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
