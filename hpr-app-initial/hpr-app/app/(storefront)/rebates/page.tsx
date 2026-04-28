import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Rebates & Tax Credits",
  description:
    "Federal tax credits and utility rebates for high-efficiency heat pumps and HVAC equipment.",
};

export default function RebatesPage() {
  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Rebates &amp; Tax Credits</h1>
      <p className="text-muted-foreground mb-8">
        High-efficiency heat pumps qualify for substantial federal tax credits and, in many states,
        utility rebates. Here&apos;s how to claim them.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Federal Tax Credit (25C)</h2>
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              The Energy Efficient Home Improvement Credit covers 30% of the cost of qualifying
              heat pumps and heat pump water heaters, up to <strong>$2,000 per year</strong> for
              heat pumps. Equipment must meet CEE&apos;s highest non-Advanced tier and be installed
              in a primary residence in the United States.
            </p>
            <p className="text-sm text-muted-foreground">
              The credit is claimed on IRS Form 5695 with your annual tax return. You&apos;ll need
              the AHRI certificate number for your specific equipment match — it&apos;s shown on
              every system package page on this site.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">High-Efficiency Electric Home Rebate (HEEHRA)</h2>
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Income-qualified households can receive up to <strong>$8,000 for a heat pump</strong>{" "}
              and <strong>$1,750 for a heat pump water heater</strong> through the federal IRA
              rebate program, administered state-by-state. Availability and program details vary
              by state &mdash; the Department of Energy maintains a current list at{" "}
              <a
                href="https://www.energy.gov/save/rebates"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                energy.gov/save/rebates
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Utility Rebates</h2>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Many electric utilities offer additional rebates for qualifying heat pumps, often in
              the $500–$2,000 range per system. Check{" "}
              <a
                href="https://www.dsireusa.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                DSIRE
              </a>{" "}
              for a current list of programs in your state.
            </p>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground italic">
        We provide this information to help you plan your project. Tax credits and rebate
        eligibility depend on your specific installation, income, and tax situation. Consult a
        tax professional before relying on any specific dollar figure.
      </p>
    </div>
  );
}
