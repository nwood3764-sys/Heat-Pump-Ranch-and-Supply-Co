"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Info, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FILTER_GROUPS,
  computeVisibleFilters,
  parseFiltersFromParams,
  type ActiveFilters,
  type FilterGroup,
  type FilterOption,
} from "@/lib/filters";

// ---------------------------------------------------------------------------
// FilterSidebar — the main exported component
// ---------------------------------------------------------------------------

interface FilterSidebarProps {
  /** Facet counts from the server: { groupKey: { optionValue: count } } */
  facets?: Record<string, Record<string, number>>;
}

export function FilterSidebar({ facets, className }: FilterSidebarProps & { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Parse active filters from URL
  const active: ActiveFilters = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams],
  );

  // Compute which groups/options are visible based on cascade rules
  const visible = useMemo(() => computeVisibleFilters(active), [active]);

  // Track collapsed groups (local UI state only)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // ------ URL update helper ------
  const updateURL = useCallback(
    (next: ActiveFilters) => {
      const params = new URLSearchParams(searchParams.toString());

      // Remove all filter keys first
      for (const group of FILTER_GROUPS) {
        params.delete(group.key);
      }

      // Add back active ones
      for (const [key, values] of Object.entries(next)) {
        if (values.size > 0) {
          params.set(key, Array.from(values).join(","));
        }
      }

      // Reset to page 1 when filters change
      params.delete("page");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams, startTransition],
  );

  // ------ Toggle a single filter option ------
  const toggleOption = useCallback(
    (groupKey: string, value: string) => {
      const next: ActiveFilters = {};
      for (const [k, v] of Object.entries(active)) {
        next[k] = new Set(v);
      }
      if (!next[groupKey]) next[groupKey] = new Set();

      if (next[groupKey].has(value)) {
        next[groupKey].delete(value);
        if (next[groupKey].size === 0) delete next[groupKey];
      } else {
        next[groupKey].add(value);
      }

      // After toggling, recompute visibility and deselect any now-hidden options
      const nextVis = computeVisibleFilters(next);
      for (const group of FILTER_GROUPS) {
        const gVis = nextVis[group.key];
        if (!gVis && next[group.key]) {
          delete next[group.key];
        } else if (gVis && gVis !== "all" && next[group.key]) {
          for (const v of next[group.key]) {
            if (!gVis.has(v)) next[group.key].delete(v);
          }
          if (next[group.key].size === 0) delete next[group.key];
        }
      }

      updateURL(next);
    },
    [active, updateURL],
  );

  // ------ Remove a single active tag ------
  const removeTag = useCallback(
    (groupKey: string, value: string) => {
      toggleOption(groupKey, value);
    },
    [toggleOption],
  );

  // ------ Reset all ------
  const resetAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const group of FILTER_GROUPS) {
      params.delete(group.key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [router, pathname, searchParams, startTransition]);

  // ------ Collapse toggle ------
  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Collect active tags for the pill bar
  const activeTags: { groupKey: string; value: string; label: string }[] = [];
  for (const group of FILTER_GROUPS) {
    const vals = active[group.key];
    if (!vals) continue;
    for (const v of vals) {
      const opt = group.options.find((o) => o.value === v);
      activeTags.push({ groupKey: group.key, value: v, label: opt?.label ?? v });
    }
  }

  const hasAnyFilter = activeTags.length > 0;

  return (
    <aside
      className={cn(
        "w-[280px] shrink-0 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto",
        "pr-2 scrollbar-thin",
        isPending && "opacity-60 pointer-events-none",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-foreground mb-3">
        <h2 className="text-lg font-bold tracking-tight">Filters</h2>
        {hasAnyFilter && (
          <button
            onClick={resetAll}
            className="text-xs text-muted-foreground underline hover:text-destructive"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Filter groups */}
      {FILTER_GROUPS.map((group) => {
        const groupVis = visible[group.key];
        if (!groupVis) return null; // entire group hidden by cascade

        const isCollapsed = collapsed.has(group.key);
        const groupActive = active[group.key] ?? new Set();

        return (
          <FilterGroupSection
            key={group.key}
            group={group}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => toggleCollapse(group.key)}
            activeValues={groupActive}
            visibleOptions={groupVis}
            facetCounts={facets?.[group.key]}
            onToggleOption={(val) => toggleOption(group.key, val)}
          />
        );
      })}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Active filter tags bar (exported separately for layout flexibility)
// ---------------------------------------------------------------------------

export function ActiveFilterTags({
  className,
}: {
  className?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const active = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams],
  );

  const tags: { groupKey: string; value: string; label: string }[] = [];
  for (const group of FILTER_GROUPS) {
    const vals = active[group.key];
    if (!vals) continue;
    for (const v of vals) {
      const opt = group.options.find((o) => o.value === v);
      tags.push({ groupKey: group.key, value: v, label: opt?.label ?? v });
    }
  }

  if (tags.length === 0) return null;

  const removeTag = (groupKey: string, value: string) => {
    const next: ActiveFilters = {};
    for (const [k, v] of Object.entries(active)) {
      next[k] = new Set(v);
    }
    if (next[groupKey]) {
      next[groupKey].delete(value);
      if (next[groupKey].size === 0) delete next[groupKey];
    }
    // Cascade cleanup
    const nextVis = computeVisibleFilters(next);
    for (const group of FILTER_GROUPS) {
      const gVis = nextVis[group.key];
      if (!gVis && next[group.key]) {
        delete next[group.key];
      } else if (gVis && gVis !== "all" && next[group.key]) {
        for (const v of next[group.key]) {
          if (!gVis.has(v)) next[group.key].delete(v);
        }
        if (next[group.key].size === 0) delete next[group.key];
      }
    }
    const params = new URLSearchParams(searchParams.toString());
    for (const group of FILTER_GROUPS) params.delete(group.key);
    for (const [key, values] of Object.entries(next)) {
      if (values.size > 0) params.set(key, Array.from(values).join(","));
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className={cn("flex gap-1.5 flex-wrap", className)}>
      {tags.map((tag) => (
        <button
          key={`${tag.groupKey}-${tag.value}`}
          onClick={() => removeTag(tag.groupKey, tag.value)}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-foreground text-background rounded-full text-[11px] font-semibold hover:bg-foreground/80 transition-colors"
        >
          {tag.label}
          <X className="h-3 w-3 opacity-70" />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: single filter group section
// ---------------------------------------------------------------------------

function FilterGroupSection({
  group,
  isCollapsed,
  onToggleCollapse,
  activeValues,
  visibleOptions,
  facetCounts,
  onToggleOption,
}: {
  group: FilterGroup;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeValues: Set<string>;
  visibleOptions: Set<string> | "all";
  facetCounts?: Record<string, number>;
  onToggleOption: (value: string) => void;
}) {
  return (
    <div
      className={cn(
        "border-b",
        group.primary ? "border-b-2 border-border/80 mb-1.5" : "border-border/50",
      )}
    >
      {/* Group header */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center w-full py-2.5 gap-1.5 text-left group/header"
      >
        <h3
          className={cn(
            "text-[12px] font-bold uppercase tracking-wider flex-1",
            group.primary && "text-[13px]",
          )}
        >
          {group.label}
        </h3>
        <Tooltip text={group.tooltip} />
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            isCollapsed && "-rotate-90",
          )}
        />
      </button>

      {/* Options */}
      {!isCollapsed && (
        <div className="pb-2.5 space-y-0.5">
          {group.options.map((opt) => {
            const isVisible =
              visibleOptions === "all" || visibleOptions.has(opt.value);
            if (!isVisible) return null;

            const isActive = activeValues.has(opt.value);
            const count = facetCounts?.[opt.value];

            return (
              <button
                key={opt.value}
                onClick={() => onToggleOption(opt.value)}
                className={cn(
                  "flex items-center gap-2 w-full py-1 px-1 rounded text-left",
                  "hover:bg-accent transition-colors",
                )}
              >
                {/* Checkbox */}
                <span
                  className={cn(
                    "h-4 w-4 shrink-0 rounded-[3px] border-2 flex items-center justify-center transition-colors",
                    isActive
                      ? "bg-foreground border-foreground"
                      : "border-border",
                  )}
                >
                  {isActive && (
                    <svg
                      className="h-2.5 w-2.5 text-background"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </span>
                <span className="text-[13px] text-foreground/80 flex-1">
                  {opt.label}
                </span>
                {count !== undefined && (
                  <span className="text-[11px] text-muted-foreground">
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: info tooltip
// ---------------------------------------------------------------------------

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => {
        e.stopPropagation();
        setShow((s) => !s);
      }}
    >
      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground/70 cursor-help transition-colors" />
      {show && (
        <span className="absolute left-6 top-[-6px] z-50 w-56 rounded-md bg-foreground text-background text-[12px] leading-relaxed p-2.5 shadow-lg pointer-events-none">
          <span className="absolute left-[-5px] top-3 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-foreground" />
          {text}
        </span>
      )}
    </span>
  );
}
