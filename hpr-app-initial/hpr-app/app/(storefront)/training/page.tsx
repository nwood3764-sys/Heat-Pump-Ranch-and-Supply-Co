import Link from "next/link";
import { GraduationCap, Calendar, Video, ArrowRight, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Training and Events",
  description: "Technical, service, and business training opportunities. View upcoming trainings and recorded sessions.",
};

export default function TrainingPage() {
  return (
    <>
      {/* Page Header */}
      <section className="bg-[#2d6a7a] text-white py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Training and Events</h1>
          <p className="text-white/80 max-w-2xl">
            We provide technical, service, and business training opportunities to help you stay competitive and grow your expertise.
          </p>
        </div>
      </section>

      {/* Upcoming Trainings */}
      <section id="upcoming" className="container py-10 md:py-14">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#2d6a7a]/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-[#2d6a7a]" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold">Upcoming Trainings</h2>
        </div>

        {/* Placeholder for upcoming events */}
        <div className="border rounded-lg bg-card p-8 md:p-12 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Training Schedule Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            We are building out our training calendar. Check back soon for upcoming technical training sessions, product demonstrations, and business development events.
          </p>
          <p className="text-sm text-muted-foreground">
            Interested in being notified about upcoming trainings?{" "}
            <Link href="/contact" className="text-[#2d6a7a] hover:underline font-medium">
              Contact us
            </Link>{" "}
            to be added to our mailing list.
          </p>
        </div>

        {/* Example of what training cards will look like */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Training Topics Include:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Heat Pump Installation Best Practices", type: "Technical", duration: "2 hours" },
              { title: "Ductless System Design & Sizing", type: "Technical", duration: "1.5 hours" },
              { title: "Refrigerant Transition (A2L)", type: "Regulatory", duration: "1 hour" },
              { title: "System Commissioning & Startup", type: "Technical", duration: "2 hours" },
              { title: "Troubleshooting Common Issues", type: "Service", duration: "1.5 hours" },
              { title: "Growing Your Heat Pump Business", type: "Business", duration: "1 hour" },
            ].map((training) => (
              <div key={training.title} className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2d6a7a]/10 text-[#2d6a7a]">
                    {training.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {training.duration}
                  </span>
                </div>
                <h4 className="font-semibold text-sm">{training.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Class Recordings */}
      <section id="recordings" className="bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#2d6a7a]/10 flex items-center justify-center">
              <Video className="h-5 w-5 text-[#2d6a7a]" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold">Training Class Recordings</h2>
          </div>

          <div className="border rounded-lg bg-white p-8 md:p-12 text-center">
            <Video className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Recorded Sessions Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              We are building a library of recorded training sessions that you can access anytime. Topics will include installation techniques, product overviews, and troubleshooting guides.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-10 md:py-14 text-center">
        <h2 className="text-xl font-bold mb-3">Want to Host a Training Event?</h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
          We can arrange on-site or virtual training sessions for your team. Contact us to discuss your training needs.
        </p>
        <Link href="/contact">
          <Button className="bg-[#2d6a7a] hover:bg-[#245a68] font-semibold">
            Request Training <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </section>
    </>
  );
}
