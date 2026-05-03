import type { Metadata } from "next";
import { ProjectPageClient } from "./project-page-client";

export const metadata: Metadata = {
  title: "My Project | The Heat Pump Ranch & Supply Co.",
  description: "Review and manage the equipment in your project before checkout.",
};

export default function ProjectPage() {
  return <ProjectPageClient />;
}
