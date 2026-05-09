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
      {/* Page Header - compact */}
      <section className="container pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Training and Events</h1>
        <p className="text-sm text-slate-500 mt-1">
          We provide technical, service, and business training opportunities to help you stay competitive and grow your expertise.
        </p>
      </section>

      {/* Upcoming Trainings */}
      <section id="upcoming" className="container py-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Trainings</h2>
        </div>

        {/* Placeholder for upcoming events */}
        <div className="border border-slate-200 rounded-lg bg-white p-6 text-center">
          <GraduationCap className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-base text-slate-900 mb-2">Training Schedule Coming Soon</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
            We are building out our training calendar. Check back soon for upcoming technical training sessions, product demonstrations, and business development events.
          </p>
          <p className="text-xs text-slate-500">
            Interested in being notified?{" "}
            <Link href="/contact" className="text-blue-600 hover:underline font-medium">
              Contact us
            </Link>{" "}
            to be added to our mailing list.
          </p>
        </div>

        {/* Training topics */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Training Topics Include:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { title: "Heat Pump Installation Best Practices", type: "Technical", duration: "2 hours" },
              { title: "Ductless System Design & Sizing", type: "Technical", duration: "1.5 hours" },
              { title: "Refrigerant Transition (A2L)", type: "Regulatory", duration: "1 hour" },
              { title: "System Commissioning & Startup", type: "Technical", duration: "2 hours" },
              { title: "Troubleshooting Common Issues", type: "Service", duration: "1.5 hours" },
              { title: "Growing Your Heat Pump Business", type: "Business", duration: "1 hour" },
            ].map((training) => (
              <div key={training.title} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                    {training.type}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {training.duration}
                  </span>
                </div>
                <h4 className="font-medium text-sm text-slate-900">{training.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Class Recordings */}
      <section id="recordings" className="container py-6 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Video className="h-4 w-4 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Training Class Recordings</h2>
        </div>

        <div className="border border-slate-200 rounded-lg bg-white p-6 text-center">
          <Video className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-base text-slate-900 mb-2">Recorded Sessions Coming Soon</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            We are building a library of recorded training sessions that you can access anytime. Topics will include installation techniques, product overviews, and troubleshooting guides.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-8 border-t border-slate-100">
        <p className="text-sm text-slate-600 mb-3">
          Want to host a training event? We can arrange on-site or virtual sessions for your team.
        </p>
        <Link href="/contact">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            Request Training <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      </section>
    </>
  );
}
