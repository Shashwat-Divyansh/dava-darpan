import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, PiggyBank, CheckCircle2, Info, ShoppingBasket } from "lucide-react";

import api from "@/lib/api";
import { formatINR, unitLabel } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import AppHeader from "@/components/AppHeader";
import CountUp from "@/components/CountUp";
import FavoriteButton from "@/components/FavoriteButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Composition-first comparison page (/compare/:compositionKey).
 *
 * The unit of comparison is a composition AT A SPECIFIC STRENGTH — never merged
 * across strengths. Left: the Jan Aushadhi generic ("the smart choice").
 * Right: ALL branded medicines sharing this exact composition, cheapest pack
 * first. Prices lead with PER-PACK (what you pay at the counter); per-tablet is
 * the smaller, verifiable detail beneath.
 */
export default function Compare() {
  const { compositionKey } = useParams(); // React Router decodes the URL param
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });

    (async () => {
      try {
        const { data } = await api.get(`/medicines/compare/${encodeURIComponent(compositionKey)}`);
        if (!cancelled) setState({ status: "ready", data, error: null });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            data: null,
            error: err.response?.data?.error || "Could not load this comparison.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [compositionKey]);

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/">
            <ArrowLeft className="size-4" /> Back to search
          </Link>
        </Button>

        {state.status === "loading" && <CompareSkeleton />}
        {state.status === "error" && <ErrorState message={state.error} />}
        {state.status === "ready" && <Result data={state.data} />}
      </div>
    </div>
  );
}

function Result({ data }) {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const {
    label,
    hasGeneric,
    generic,
    otherGenerics,
    brands,
    brandCount,
    compositionKey,
    savingsPerUnit,
    savingsPercentUnit,
  } = data;

  // brands arrive ranked by PER-TABLET price (the apples-to-apples figure).
  const cheapestBrand = brands[0] || null;
  // Per-unit noun (tablet/capsule) from the brand packs; generics ("15's") don't name one.
  const unit = unitLabel(cheapestBrand?.packSize || "");

  return (
    <div className="space-y-6">
      {/* Composition header — the composition IS the product identity */}
      <header className="text-center">
        <Badge variant="secondary" className="mb-2">Composition</Badge>
        <h1 className="font-display text-4xl font-bold tracking-tight">{label}</h1>
        <p className="mt-1 text-muted-foreground">
          {brandCount} branded option{brandCount === 1 ? "" : "s"} ·{" "}
          {hasGeneric ? "Jan Aushadhi generic available" : "no Jan Aushadhi generic listed"}
        </p>
      </header>

      {/* Savings banner — per tablet vs the cheapest branded option (like for like) */}
      {hasGeneric && cheapestBrand && savingsPerUnit > 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center shadow-sm dark:border-green-900 dark:bg-green-950/40">
          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
            <PiggyBank className="size-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">You save at least</span>
          </div>
          <div className="font-display mt-1 text-6xl font-black text-green-700 dark:text-green-400">
            <CountUp value={savingsPerUnit} format={formatINR} />
            <span className="text-2xl font-semibold"> / {unit}</span>
          </div>
          <p className="mt-2 text-sm text-green-800/80 dark:text-green-400/80">
            {savingsPercentUnit}% less per {unit} than the cheapest branded option.
          </p>
        </div>
      )}

      {/* Two-sided comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* LEFT: the Jan Aushadhi generic */}
        <div className="space-y-3">
          {hasGeneric ? (
            <>
              <GenericCard generic={generic} unit={unit} compositionKey={compositionKey} />
              {otherGenerics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Other Jan Aushadhi packs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {otherGenerics.map((g, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{g.genericName}</span>
                        <span className="whitespace-nowrap font-medium">
                          {formatINR(g.mrp)} / {g.unitSize}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <NoGenericCard label={label} />
          )}
        </div>

        {/* RIGHT: every brand with this exact composition, cheapest pack first */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="font-semibold">Branded options ({brandCount})</h2>
            {!user && brandCount > 0 && (
              <span className="text-xs text-muted-foreground">Log in to save to basket</span>
            )}
          </div>
          {brandCount === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No branded medicines in our curated list for this composition.
              </CardContent>
            </Card>
          ) : (
            brands.map((b, i) => <BrandRow key={b.id} brand={b} isCheapest={i === 0} unit={unit} />)
          )}
        </div>
      </div>

      {/* The honest line — per-tablet is the like-for-like comparison; pack
          prices and sizes are stated so the math is verifiable. */}
      {hasGeneric && cheapestBrand && savingsPerUnit > 0 && (
        <p className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
          Even the cheapest branded option (
          <span className="font-medium text-foreground">
            {cheapestBrand.brandName}, {formatINR(cheapestBrand.mrp)} for {cheapestBrand.packSize}
          </span>
          ) works out to {formatINR(cheapestBrand.perUnitPrice)} per {unit} —{" "}
          <span className="font-semibold text-green-700 dark:text-green-400">
            {formatINR(savingsPerUnit)} more per {unit}
          </span>{" "}
          than the Jan Aushadhi generic ({formatINR(generic.mrp)} for {generic.unitSize},{" "}
          {formatINR(generic.perUnitPrice)} per {unit}).
        </p>
      )}

      {/* Clear path to the basket once something is saved. */}
      {user && favorites.length > 0 && (
        <div className="pointer-events-none sticky bottom-4 flex justify-center">
          <Button asChild size="lg" className="pointer-events-auto shadow-lg">
            <Link to="/favorites">
              <ShoppingBasket className="size-4" />
              View basket ({favorites.length}) →
            </Link>
          </Button>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Prices are indicative pack MRPs. Per-{unit} price = pack price ÷ units per pack, so packs of
        different sizes compare fairly.
      </p>
    </div>
  );
}

/** LEFT card: the Jan Aushadhi generic — pack price leads, per-unit beneath. */
function GenericCard({ generic, unit, compositionKey }) {
  return (
    <Card className="border-green-300 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
      <CardHeader className="gap-2">
        <Badge variant="default" className="bg-green-600 text-white">
          <CheckCircle2 className="size-3" />
          Jan Aushadhi · Smart choice
        </Badge>
        <CardTitle className="text-base leading-snug">{generic.genericName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-display text-4xl font-bold">
          {formatINR(generic.mrp)}
          <span className="font-sans text-base font-medium text-muted-foreground">
            {" "}
            / pack of {generic.unitSize}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatINR(generic.perUnitPrice)} per {unit}
        </p>
        {/* Save THE GENERIC itself — the primary way to build the basket. */}
        <FavoriteButton compositionKey={compositionKey} className="mt-4 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * RIGHT rows: one branded medicine. Name block left, PRICE COLUMN right-aligned
 * (pack price bold, per-unit beneath) so prices scan cleanly down the list.
 */
function BrandRow({ brand, isCheapest, unit }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{brand.brandName}</span>
            {isCheapest && <Badge variant="saffron">Cheapest branded</Badge>}
          </div>
          {brand.manufacturer && (
            <p className="text-xs text-muted-foreground">{brand.manufacturer}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-xl font-bold leading-tight">{formatINR(brand.mrp)}</div>
          <p className="text-xs text-muted-foreground">/ {brand.packSize}</p>
          <p className="text-xs font-medium text-muted-foreground">
            {formatINR(brand.perUnitPrice)} / {unit}
          </p>
        </div>
        <FavoriteButton brandId={brand.id} compact />
      </CardContent>
    </Card>
  );
}

/** Honest empty state when no Jan Aushadhi generic matches this composition. */
function NoGenericCard({ label }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Info className="size-9 text-muted-foreground" />
        <h2 className="font-semibold">No Jan Aushadhi generic listed</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          No Jan Aushadhi generic is currently listed for{" "}
          <span className="font-medium text-foreground">{label}</span>. The branded options are
          shown for reference — check your local kendra, as stock can differ from the official list.
        </p>
      </CardContent>
    </Card>
  );
}

function CompareSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-destructive">{message}</p>
        <Button asChild variant="outline">
          <Link to="/">Back to search</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
