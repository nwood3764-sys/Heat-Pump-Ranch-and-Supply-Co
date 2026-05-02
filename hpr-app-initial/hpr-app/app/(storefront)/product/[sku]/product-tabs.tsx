"use client";

import { useState } from "react";
import { FileText, Video, BookOpen, Download } from "lucide-react";

type Doc = { url: string; file_name: string; doc_type: string | null };

interface ProductTabsProps {
  description: string | null;
  specEntries: [string, unknown][];
  docs: Doc[];
}

const tabs = [
  { id: "description", label: "Description", icon: BookOpen },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "videos", label: "Videos", icon: Video },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ProductTabs({ description, specEntries, docs }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("description");

  return (
    <section className="mt-12">
      {/* Tab headers */}
      <div className="border-b">
        <nav className="flex gap-0 -mb-px" aria-label="Product information tabs">
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
                {tab.id === "documents" && docs.length > 0 && (
                  <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5">
                    {docs.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="py-6">
        {activeTab === "description" && (
          <div className="max-w-3xl">
            {description ? (
              <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground/85 leading-relaxed">
                {description}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No description available for this product.
              </p>
            )}

            {/* Specs table below description */}
            {specEntries.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">Specifications</h3>
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
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="max-w-3xl">
            {docs.length > 0 ? (
              <div className="grid gap-3">
                {docs.map((d, i) => (
                  <a
                    key={i}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-primary">
                        {d.file_name}
                      </div>
                      {d.doc_type && (
                        <div className="text-xs text-muted-foreground capitalize">
                          {d.doc_type.replace(/_/g, " ")}
                        </div>
                      )}
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No documents available for this product yet.
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
