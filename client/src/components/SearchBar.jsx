import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";

import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Autocomplete search bar.
 * Debounces input by 250ms, calls /medicines/search, shows a dropdown of brand
 * suggestions, supports keyboard navigation, and navigates to the comparison
 * page on selection.
 */
export default function SearchBar() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Debounced search: only hit the API 250ms after the user stops typing.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/medicines/search", { params: { q } });
        setResults(data.results);
      } catch {
        setResults([]); // network/auth error → show "no results" gracefully
      } finally {
        setLoading(false);
        setOpen(true);
        setActiveIndex(-1);
      }
    }, 250);

    return () => clearTimeout(timer); // cancel if the user types again
  }, [query]);

  // Close the dropdown when clicking outside the component.
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goToCompare(compositionKey) {
    setOpen(false);
    setQuery("");
    // The key contains "|" and "+", so it must be URL-encoded in the path.
    navigate(`/compare/${encodeURIComponent(compositionKey)}`);
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[activeIndex] || results[0];
      if (pick) goToCompare(pick.compositionKey);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showNoResults = open && !loading && query.trim() && results.length === 0;

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search a composition or brand — e.g. Paracetamol 650mg, or Dolo"
          aria-label="Search medicines"
          className="h-14 rounded-2xl pl-11 pr-10 text-base shadow-md sm:text-lg"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (results.length > 0 || showNoResults) && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
          {showNoResults ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No medicines found for “{query.trim()}”.
            </div>
          ) : (
            <ul className="max-h-80 overflow-auto py-1">
              {results.map((r, i) => (
                <li key={r.compositionKey}>
                  {/* Suggestions are COMPOSITIONS (strength-specific). A brand
                      match shows as an alias: "Dolo 650 → Paracetamol 650mg". */}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => goToCompare(r.compositionKey)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors",
                      i === activeIndex ? "bg-accent" : "hover:bg-accent/60"
                    )}
                  >
                    <span className="font-medium">
                      {r.viaBrand ? (
                        <>
                          {r.viaBrand} <span className="text-muted-foreground">→</span> {r.label}
                        </>
                      ) : (
                        r.label
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.brandCount > 0
                        ? `${r.brandCount} brand${r.brandCount === 1 ? "" : "s"} available`
                        : "No curated brands"}
                      {" · "}
                      {r.hasGeneric ? "Jan Aushadhi listed" : "no Jan Aushadhi generic"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
