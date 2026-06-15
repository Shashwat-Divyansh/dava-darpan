import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, PiggyBank, CheckCircle2, Info } from "lucide-react";

import api from "@/lib/api";
import { formatINR, unitLabel } from "@/lib/currency";
import AppHeader from "@/components/AppHeader";
import FavoriteButton from "@/components/FavoriteButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Comparison page (/compare/:brandId).
 * Fetches the brand + its Jan Aushadhi generic matches and shows a side-by-side
 * comparison with a prominent per-unit savings reveal.
 */
export default function Compare() {
  const { brandId } = useParams();
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });

    (async () => {
      try {
        const { data } = await api.get(`/medicines/match/${brandId}`);
        if (!cancelled) setState({ status: "ready", data, error: null });
      } catch (err) {
        if (!cancelled) {
          setState({ status: "error", data: null, error: err.response?.data?.error || "Could not load comparison." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [brandId]);

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
  const { brand, hasGenericEquivalent, cheapestGeneric, savingsPerUnit, savingsPercent, generics, matchCount } = data;
  const unit = unitLabel(brand.packSize);

  return (
    <div className="space-y-6">
      {/* Brand header */}
      <header className="text-center">
        <Badge variant="secondary" className="mb-2">Branded medicine</Badge>
        <h1 className="text-3xl font-extrabold tracking-tight">{brand.brandName}</h1>
        <p className="mt-1 text-muted-foreground">
          {brand.composition}
          {brand.manufacturer ? ` · ${brand.manufacturer}` : ""}
        </p>
        <div className="mt-4 flex justify-center">
          <FavoriteButton brandId={brand.id} />
        </div>
      </header>

      {hasGenericEquivalent ? (
        <>
          {/* Savings banner — the emotional payoff */}
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center shadow-sm dark:border-green-900 dark:bg-green-950/40">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
              <PiggyBank className="size-6" />
              <span className="text-sm font-semibold uppercase tracking-wide">You save</span>
            </div>
            <div className="mt-1 text-5xl font-extrabold text-green-700 dark:text-green-400">
              {formatINR(savingsPerUnit)}
              <span className="text-2xl font-semibold"> / {unit}</span>
            </div>
            <p className="mt-2 text-sm text-green-800/80 dark:text-green-400/80">
              That&apos;s <span className="font-bold">{savingsPercent}% cheaper</span> with the Jan Aushadhi generic.
            </p>
          </div>

          {/* Side-by-side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PriceCard
              tag="Branded"
              title={brand.brandName}
              subtitle={brand.composition}
              perUnit={brand.perUnitPrice}
              unit={unit}
              packPrice={brand.mrp}
              packSize={brand.packSize}
              tone="neutral"
            />
            <PriceCard
              tag="Jan Aushadhi · Smart choice"
              title={cheapestGeneric.genericName}
              subtitle={`Pack of ${cheapestGeneric.unitSize}`}
              perUnit={cheapestGeneric.perUnitPrice}
              unit={unit}
              packPrice={cheapestGeneric.mrp}
              packSize={cheapestGeneric.unitSize}
              tone="generic"
            />
          </div>

          {/* Other matching generics */}
          {matchCount > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Other Jan Aushadhi options ({matchCount - 1})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {generics.slice(1).map((g, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 border-b pb-2 text-sm last:border-0 last:pb-0"
                  >
                    <span>{g.genericName}</span>
                    <span className="whitespace-nowrap font-medium">
                      {formatINR(g.perUnitPrice)}/{unit}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({formatINR(g.mrp)} / {g.unitSize})
                      </span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Prices are indicative. Per-unit price = pack price ÷ units per pack, so packs of different sizes compare fairly.
          </p>
        </>
      ) : (
        <NoEquivalent brand={brand} />
      )}
    </div>
  );
}

/** One price card. Generic variant is green-tinted as "the smart choice". */
function PriceCard({ tag, title, subtitle, perUnit, unit, packPrice, packSize, tone }) {
  const isGeneric = tone === "generic";
  return (
    <Card className={isGeneric ? "border-green-300 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20" : ""}>
      <CardHeader className="gap-2">
        <Badge variant={isGeneric ? "default" : "secondary"} className={isGeneric ? "bg-green-600 text-white" : ""}>
          {isGeneric && <CheckCircle2 className="size-3" />}
          {tag}
        </Badge>
        <CardTitle className="text-base leading-snug">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-extrabold">
          {formatINR(perUnit)}
          <span className="text-base font-medium text-muted-foreground"> / {unit}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatINR(packPrice)} for {packSize}
        </p>
      </CardContent>
    </Card>
  );
}

/** Honest empty state when no Jan Aushadhi generic matches the composition. */
function NoEquivalent({ brand }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Info className="size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">No Jan Aushadhi generic equivalent listed</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          We couldn&apos;t find a Jan Aushadhi generic matching the composition{" "}
          <span className="font-medium text-foreground">{brand.composition}</span> in the current product list.
          This doesn&apos;t necessarily mean none exists — the official list may differ from what&apos;s stocked at your local kendra.
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link to="/">Search another medicine</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function CompareSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
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
