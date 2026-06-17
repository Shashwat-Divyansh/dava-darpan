import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, PiggyBank, ShoppingBasket, Info, MapPin } from "lucide-react";

import { useFavorites } from "@/context/FavoritesContext";
import { formatINR, unitsLabel, unitLabel as unitLabelOf } from "@/lib/currency";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The savings basket. Each favorite row has a checkbox (checked by default);
 * the summary recomputes branded vs Jan Aushadhi cost and savings live from the
 * CHECKED rows only, using per-pack prices. Unchecking excludes a row from the
 * totals but keeps it; the trash button removes it entirely.
 */
export default function Favorites() {
  const { favorites, removeFavorite, loading } = useFavorites();

  // Track which rows are UNCHECKED. Anything not in this set counts as checked,
  // so new favorites default to checked and manual unchecks persist on the page.
  const [unchecked, setUnchecked] = useState(() => new Set());
  const isChecked = (id) => !unchecked.has(id);

  function toggleChecked(id) {
    setUnchecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Totals from CHECKED rows only. No-equivalent items count at branded price in
  // BOTH totals (there's no generic to switch to).
  const totals = useMemo(() => {
    let brandedTotal = 0;
    let genericTotal = 0;
    let noEquivAmount = 0;
    let noEquivCount = 0;
    let checkedCount = 0;

    for (const f of favorites) {
      if (unchecked.has(f.brand.id)) continue;
      checkedCount++;
      brandedTotal += f.brand.mrp;
      if (f.hasGenericEquivalent) {
        genericTotal += f.cheapestGeneric.mrp;
      } else {
        genericTotal += f.brand.mrp; // no generic → stays at branded price
        noEquivAmount += f.brand.mrp;
        noEquivCount++;
      }
    }

    const savings = brandedTotal - genericTotal;
    const savingsPercent = brandedTotal > 0 ? Math.round((savings / brandedTotal) * 100) : 0;
    return { brandedTotal, genericTotal, savings, savingsPercent, noEquivAmount, noEquivCount, checkedCount };
  }, [favorites, unchecked]);

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight">My Medicine Basket</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tick the medicines you buy to estimate how much you&apos;d save by choosing Jan Aushadhi generics.
          </p>
        </header>

        {loading && favorites.length === 0 ? (
          <p className="text-muted-foreground">Loading your basket…</p>
        ) : favorites.length === 0 ? (
          <EmptyBasket />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Rows */}
            <div className="space-y-3 lg:col-span-2">
              {favorites.map((f) => (
                <FavoriteRow
                  key={f.brand.id}
                  item={f}
                  checked={isChecked(f.brand.id)}
                  onToggle={() => toggleChecked(f.brand.id)}
                  onRemove={() => removeFavorite(f.brand.id)}
                />
              ))}
            </div>

            {/* Live summary */}
            <aside className="lg:sticky lg:top-6 lg:h-fit">
              <SummaryCard totals={totals} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function FavoriteRow({ item, checked, onToggle, onRemove }) {
  const { brand, hasGenericEquivalent, cheapestGeneric } = item;
  const perPackSavings = hasGenericEquivalent ? brand.mrp - cheapestGeneric.mrp : 0;

  return (
    <Card className={checked ? "" : "opacity-60"}>
      <CardContent className="flex items-start gap-3 py-4">
        <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-1" aria-label={`Include ${brand.brandName} in totals`} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold leading-tight">{brand.brandName}</p>
              <p className="text-xs text-muted-foreground">{brand.composition}</p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${brand.brandName}`}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          {/* Price columns */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {/* Branded */}
            <div className="rounded-lg border bg-background p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Branded</p>
              <p className="mt-0.5 font-semibold">{formatINR(brand.mrp)} <span className="text-xs font-normal text-muted-foreground">/ {unitsLabel(brand.packCount, brand.packSize)}</span></p>
              <p className="text-xs text-muted-foreground">{formatINR(brand.perUnitPrice)} / {unitLabelOf(brand.packSize)}</p>
            </div>

            {/* Generic or no-equivalent note */}
            {hasGenericEquivalent ? (
              <div className="rounded-lg border border-green-300 bg-green-50/60 p-3 dark:border-green-900 dark:bg-green-950/20">
                <p className="text-[11px] font-medium uppercase tracking-wide text-green-700 dark:text-green-400">Jan Aushadhi</p>
                <p className="mt-0.5 font-semibold text-green-800 dark:text-green-300">{formatINR(cheapestGeneric.mrp)} <span className="text-xs font-normal text-green-700/70 dark:text-green-400/70">/ {unitsLabel(cheapestGeneric.packCount, brand.packSize)}</span></p>
                <p className="text-xs text-green-700/70 dark:text-green-400/70">{formatINR(cheapestGeneric.perUnitPrice)} / {unitLabelOf(brand.packSize)}</p>
              </div>
            ) : (
              <div className="flex flex-col justify-center rounded-lg border border-dashed p-3">
                <Badge variant="secondary" className="mb-1 w-fit">No generic</Badge>
                <p className="text-xs text-muted-foreground">No cheaper generic available — branded price only.</p>
              </div>
            )}
          </div>

          {hasGenericEquivalent && (
            <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-400">
              Save {formatINR(perPackSavings)} / pack
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ totals }) {
  const { brandedTotal, genericTotal, savings, savingsPercent, noEquivAmount, noEquivCount, checkedCount } = totals;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBasket className="size-5 text-primary" /> Basket summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label={`Branded cost (${checkedCount} selected)`} value={formatINR(brandedTotal)} />
        <Row label="Jan Aushadhi cost" value={formatINR(genericTotal)} valueClass="text-green-700 dark:text-green-400" />

        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center dark:border-green-900 dark:bg-green-950/40">
          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
            <PiggyBank className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Total savings</span>
          </div>
          <p className="mt-1 text-3xl font-extrabold text-green-700 dark:text-green-400">{formatINR(savings)}</p>
          <p className="text-xs text-green-700/80 dark:text-green-400/80">{savingsPercent}% less than branded</p>
        </div>

        {/* Nudge to act on the savings by visiting a kendra — only when there's
            an actual saving from at least one generic-equivalent item. */}
        {savings > 0 && (
          <div className="rounded-xl border border-green-200 bg-green-50/70 p-3 dark:border-green-900 dark:bg-green-950/30">
            <p className="flex items-start gap-2 text-xs text-green-800 dark:text-green-300">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              Ready to save {formatINR(savings)}? Find a Jan Aushadhi Kendra near you to buy these generics.
            </p>
            <Button asChild size="sm" className="mt-2 w-full bg-green-600 hover:bg-green-700">
              <Link to="/kendras">
                <MapPin className="size-4" /> Find a Kendra →
              </Link>
            </Button>
          </div>
        )}

        {noEquivCount > 0 && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Includes {formatINR(noEquivAmount)} from {noEquivCount} medicine{noEquivCount === 1 ? "" : "s"} with no generic equivalent (charged at branded price).
          </p>
        )}
        {checkedCount === 0 && (
          <p className="text-xs text-muted-foreground">Tick at least one medicine to see your savings.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, valueClass = "" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function EmptyBasket() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <ShoppingBasket className="size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Your basket is empty</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Search a medicine and tap “Add to basket” to start tracking your potential savings.
        </p>
        <Button asChild className="mt-2">
          <Link to="/">Search medicines</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
