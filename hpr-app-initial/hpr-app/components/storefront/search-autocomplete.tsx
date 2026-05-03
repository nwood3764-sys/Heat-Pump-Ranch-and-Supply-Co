"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2, ArrowRight, Package, Box } from "lucide-react";
import { formatPrice } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchSuggestion {
  id: number;
  type: "product" | "system";
  sku: string;
  brand: string;
  title: string;
  thumbnailUrl: string | null;
  href: string;
  price: string | null;
  msrp: string | null;
  productType?: string;
}

interface SearchResponse {
  suggestions: SearchSuggestion[];
  total: number;
  query: string;
}

// ---------------------------------------------------------------------------
// Hook: debounced value
// ---------------------------------------------------------------------------

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchAutocomplete() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 300);

  // -----------------------------------------------------------------------
  // Fetch suggestions when debounced query changes
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setTotalResults(0);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data: SearchResponse) => {
        if (cancelled) return;
        setSuggestions(data.suggestions);
        setTotalResults(data.total);
        setIsOpen(data.suggestions.length > 0);
        setActiveIndex(-1);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
        setTotalResults(0);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // -----------------------------------------------------------------------
  // Close dropdown on outside click
  // -----------------------------------------------------------------------

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setMobileExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -----------------------------------------------------------------------
  // Navigate to full results
  // -----------------------------------------------------------------------

  const goToResults = useCallback(() => {
    if (query.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      setMobileExpanded(false);
      inputRef.current?.blur();
    }
  }, [query, router]);

  // -----------------------------------------------------------------------
  // Navigate to a suggestion
  // -----------------------------------------------------------------------

  const goToSuggestion = useCallback(
    (suggestion: SearchSuggestion) => {
      router.push(suggestion.href);
      setIsOpen(false);
      setQuery("");
      setMobileExpanded(false);
      inputRef.current?.blur();
    },
    [router]
  );

  // -----------------------------------------------------------------------
  // Keyboard navigation
  // -----------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "Enter") {
          e.preventDefault();
          goToResults();
        }
        return;
      }

      // Total navigable items = suggestions + 1 ("View all results" row)
      const itemCount = suggestions.length + (query.trim() ? 1 : 0);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % itemCount);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev <= 0 ? itemCount - 1 : prev - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            goToSuggestion(suggestions[activeIndex]);
          } else {
            goToResults();
          }
          break;
        case "Escape":
          setIsOpen(false);
          setActiveIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, suggestions, activeIndex, query, goToResults, goToSuggestion]
  );

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const typeLabel = (s: SearchSuggestion) => {
    if (s.type === "system") return "System";
    if (s.productType === "accessory") return "Accessory";
    if (s.productType === "part") return "Part";
    return "Equipment";
  };

  const typeIcon = (s: SearchSuggestion) => {
    if (s.type === "system") return <Box className="h-3.5 w-3.5" />;
    return <Package className="h-3.5 w-3.5" />;
  };

  // -----------------------------------------------------------------------
  // Highlight matching text in title
  // -----------------------------------------------------------------------

  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-100 text-foreground rounded-sm px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      {/* Desktop search — visible sm+ */}
      <div className="relative flex-1 max-w-2xl hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search by SKU, model, or keyword…"
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls="search-suggestions"
          />
          {/* Loading spinner or clear button */}
          {isLoading ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : query.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            id="search-suggestions"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <ul className="py-1">
              {suggestions.map((s, i) => (
                <li
                  key={`${s.type}-${s.id}`}
                  role="option"
                  aria-selected={activeIndex === i}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    activeIndex === i
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => goToSuggestion(s)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded border bg-muted flex-shrink-0 overflow-hidden">
                    {s.thumbnailUrl ? (
                      <img
                        src={s.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        {typeIcon(s)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {highlightMatch(s.title, query)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">
                        {typeIcon(s)}
                        {typeLabel(s)}
                      </span>
                      <span>{s.brand}</span>
                      <span className="hidden md:inline">·</span>
                      <span className="hidden md:inline">{s.sku}</span>
                    </div>
                  </div>

                  {/* Price */}
                  {s.price && (
                    <div className="text-right flex-shrink-0">
                      {s.msrp && parseFloat(s.msrp) > parseFloat(s.price) && (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatPrice(s.msrp)}
                        </div>
                      )}
                      <div className="text-sm font-bold text-green-700">
                        {formatPrice(s.price)}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* View all results link */}
            {query.trim() && (
              <div
                role="option"
                aria-selected={activeIndex === suggestions.length}
                className={`flex items-center justify-between px-3 py-2.5 border-t cursor-pointer transition-colors text-sm font-medium ${
                  activeIndex === suggestions.length
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-primary"
                }`}
                onClick={goToResults}
                onMouseEnter={() => setActiveIndex(suggestions.length)}
              >
                <span>
                  View all results for &ldquo;{query.trim()}&rdquo;
                  {totalResults > suggestions.length && (
                    <span className="text-muted-foreground font-normal ml-1">
                      ({totalResults}+ results)
                    </span>
                  )}
                </span>
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile search toggle — visible below sm */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => {
            setMobileExpanded(true);
            // Focus input after render
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="p-2 text-muted-foreground hover:text-foreground"
          aria-label="Open search"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile search overlay */}
      {mobileExpanded && (
        <div className="fixed inset-0 z-50 bg-background sm:hidden">
          <div className="flex items-center gap-2 px-4 h-14 border-b">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by SKU, model, or keyword…"
              className="flex-1 h-full bg-transparent text-sm outline-none"
              autoComplete="off"
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
            )}
            <button
              type="button"
              onClick={() => {
                setMobileExpanded(false);
                setQuery("");
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="text-sm font-medium text-primary pl-2"
            >
              Cancel
            </button>
          </div>

          {/* Mobile suggestions list */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 3.5rem)" }}>
            {suggestions.length > 0 && (
              <ul>
                {suggestions.map((s, i) => (
                  <li
                    key={`m-${s.type}-${s.id}`}
                    className={`flex items-center gap-3 px-4 py-3 border-b cursor-pointer ${
                      activeIndex === i ? "bg-accent" : ""
                    }`}
                    onClick={() => goToSuggestion(s)}
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded border bg-muted flex-shrink-0 overflow-hidden">
                      {s.thumbnailUrl ? (
                        <img
                          src={s.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {typeIcon(s)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-2">
                        {highlightMatch(s.title, query)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">
                          {typeLabel(s)}
                        </span>
                        <span>{s.brand}</span>
                      </div>
                    </div>

                    {/* Price */}
                    {s.price && (
                      <div className="text-right flex-shrink-0">
                        {s.msrp && parseFloat(s.msrp) > parseFloat(s.price) && (
                          <div className="text-xs text-muted-foreground line-through">
                            {formatPrice(s.msrp)}
                          </div>
                        )}
                        <div className="text-sm font-bold text-green-700">
                          {formatPrice(s.price)}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* View all results — mobile */}
            {query.trim() && debouncedQuery.length >= 2 && (
              <button
                type="button"
                onClick={goToResults}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-primary border-b"
              >
                <span>
                  View all results for &ldquo;{query.trim()}&rdquo;
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {/* Empty state */}
            {query.trim().length >= 2 && !isLoading && suggestions.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Hint when empty */}
            {query.trim().length < 2 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
