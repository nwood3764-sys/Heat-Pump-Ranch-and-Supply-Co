"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FilterSidebar } from "./filter-sidebar";
import { cn } from "@/lib/utils";
import { FILTER_GROUPS, parseFiltersFromParams } from "@/lib/filters";

/**
 * Mobile filter drawer — shows a "Filters" button on small screens that
 * slides the FilterSidebar in from the left as a full-height overlay.
 */
export function MobileFilterDrawer() {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  // Count active filters for the badge
  const active = parseFiltersFromParams(searchParams);
  let activeCount = 0;
  for (const vals of Object.values(active)) {
    activeCount += vals.size;
  }

  // Close drawer when filters change (user made a selection)
  // We keep it open so they can multi-select, but close on route change
  // Actually, keep it open for multi-select — only close on explicit tap

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Trigger button — only visible on mobile (lg:hidden) */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 border-2 border-foreground rounded-lg font-semibold text-sm hover:bg-accent transition-colors"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-foreground text-background text-[11px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[320px] max-w-[85vw] bg-background shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-bold">Filters</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable filter content */}
        <div className="overflow-y-auto h-[calc(100%-120px)] px-4 py-3">
          <FilterSidebar className="!w-full !static !max-h-none !overflow-visible" />
        </div>

        {/* Bottom action bar */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t bg-background">
          <button
            onClick={() => setOpen(false)}
            className="w-full py-2.5 rounded-lg bg-foreground text-background font-semibold text-sm hover:bg-foreground/90 transition-colors"
          >
            Show Results
            {activeCount > 0 && ` (${activeCount} filters)`}
          </button>
        </div>
      </div>
    </>
  );
}
