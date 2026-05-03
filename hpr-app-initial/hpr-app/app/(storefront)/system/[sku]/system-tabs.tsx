"use client";

import { useState } from "react";
import { BookOpen, Video } from "lucide-react";

interface SystemTabsProps {
  description: string | null;
  specEntries: [string, unknown][];
}

const tabs = [
  { id: "description", label: "Specifications", icon: BookOpen },
  { id: "videos", label: "Videos", icon: Video },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SystemTabs({ description, specEntries }: SystemTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("description");

  return (
    <section className="mt-12">
      {/* Tab headers */}
      <div className="border-b">
        <nav className="flex gap-0 -mb-px" aria-label="System information tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  inline-flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors
                  ${isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  }
                `}
                aria-selected={isActive}
                role="tab"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="py-6">
        {activeTab === "description" && (
          <div className="max-w-3xl">
            {description && (
              <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground/85 leading-relaxed mb-8">
                {description}
              </div>
            )}

            {/* Specs table */}
            {specEntries.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold mb-3">System Specifications</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {specEntries.map(([k, v], i) => (
                        <tr key={k} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                          <th className="text-left font-medium px-3 py-2 w-1/2 align-top capitalize">
                            {k.replace(/_/g, " ")}
                          </th>
                          <td className="px-3 py-2 text-foreground/85">{String(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No specifications available for this system yet.
              </p>
            )}
          </div>
        )}

        {activeTab === "videos" && (
          <div className="max-w-3xl">
            <p className="text-muted-foreground text-sm italic">
              Installation and product videos coming soon.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
