import type { Metadata } from "next";
import { ProjectPageClient } from "./project-page-client";

export const metadata: Metadata = {
  title: "My Projects | The Heat Pump Ranch & Supply Co.",
  description: "Manage your HVAC equipment projects. Organize equipment by job site, property, or installation before checkout.",
};

export default function ProjectPage() {
  return <ProjectPageClient />;
}
