import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, PiggyBank, ShoppingBasket, Info, MapPin, CheckCircle2 } from "lucide-react";

import { useFavorites } from "@/context/FavoritesContext";
import { formatINR, unitsLabel, unitLabel as unitLabelOf } from "@/lib/currency";
import AppHeader from "@/components/AppHeader";
import CountUp from "@/components/CountUp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The savings basket. Rows come in two kinds:
 *  - "brand":   a saved branded medicine, compared against its Jan Aushadhi generic.
 *  - "generic": a saved Jan Aushadhi generic, with the cheapest branded option
 *               as the "what you'd have paid" context.
 * The summary recomputes live from CHECKED rows only, using per-pack prices:
 * "if you'd bought brands: ₹X · buying generics where available: ₹Y".
 */
export default function Favorites() {
  const { favorites, removeByFavoriteId, updateQuantity, loading } = useFavorites();

  // Track UNCHECKED rows (by favoriteId); anything not in the set counts.
  const [unchecked, setUnchecked] = useState(() => new Set());
  const isChecked = (id) => !unchecked.has(id);

  function toggleChecked(id) {
    setUnchecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Totals from CHECKED rows only, per-pack prices × quantity:
  //  brand row:   branded += brand pack × qty; generic += equivalent pack × qty (or brand pack × qty if none)
  //  generic row: branded += cheapest-branded pack × qty (or generic pack × qty if no brand); generic += generic pack × qty
  const totals = useMemo(() => {
    let brandedTotal = 0;
    let genericTotal = 0;
    let noEquivAmount = 0;
    let noEquivCount = 0;
    let checkedCount = 0;

    for (const f of favorites) {
      if (unchecked.has(f.favoriteId)) continue;
      checkedCount++;
      const qty = f.quantity || 1;

      if (f.kind === "generic") {
        genericTotal += f.generic.mrp * qty;
        brandedTotal += (f.cheapestBrand ? f.cheapestBrand.mrp : f.generic.mrp) * qty;
      } else {
        brandedTotal += f.brand.mrp * qty;
        if (f.hasGenericEquivalent) {
          genericTotal += f.cheapestGeneric.mrp * qty;
        } else {
          genericTotal += f.brand.mrp * qty; // no generic → stays at branded price
          noEquivAmount += f.brand.mrp * qty; // disclosure scales with qty too
          noEquivCount++;
        }
      }
    }

    // Guard against floating-point drift from the multiplications.
    const r2 = (n) => Math.round(n * 100) / 100;
    brandedTotal = r2(brandedTotal);
    genericTotal = r2(genericTotal);
    noEquivAmount = r2(noEquivAmount);

    const savings = r2(brandedTotal - genericTotal);
    const savingsPercent = brandedTotal > 0 ? Math.round((savings / brandedTotal) * 100) : 0;
    return { brandedTotal, genericTotal, savings, savingsPercent, noEquivAmount, noEquivCount, checkedCount };
  }, [favorites, unchecked]);

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight">My Medicine Basket</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tick the medicines you buy to estimate how much you&apos;d save by choosing Jan Aushadhi
            generics.
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
              {favorites.map((f) =>
                f.kind === "generic" ? (
                  <GenericRow
                    key={f.favoriteId}
                    item={f}
                    checked={isChecked(f.favoriteId)}
                    onToggle={() => toggleChecked(f.favoriteId)}
                    onRemove={() => removeByFavoriteId(f.favoriteId)}
                    onQuantityChange={(q) => updateQuantity(f.favoriteId, q)}
                  />
                ) : (
                  <BrandFavoriteRow
                    key={f.favoriteId}
                    item={f}
                    checked={isChecked(f.favoriteId)}
                    onToggle={() => toggleChecked(f.favoriteId)}
                    onRemove={() => removeByFavoriteId(f.favoriteId)}
                    onQuantityChange={(q) => updateQuantity(f.favoriteId, q)}
                  />
                )
              )}
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

/** Shared row chrome: checkbox, title area, trash. */
function RowShell({ checked, onToggle, onRemove, ariaName, children }) {
  return (
    <Card className={checked ? "" : "opacity-60"}>
      <CardContent className="flex items-start gap-3 py-4">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          className="mt-1"
          aria-label={`Include ${ariaName} in totals`}
        />
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${ariaName}`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </CardContent>
    </Card>
  );
}

/** A saved JAN AUSHADHI GENERIC (kind "generic"). */
function GenericRow({ item, checked, onToggle, onRemove, onQuantityChange }) {
  const { label, generic, cheapestBrand, savingsPerPack } = item;
  const unit = unitLabelOf(cheapestBrand?.packSize || "");

  return (
    <RowShell checked={checked} onToggle={onToggle} onRemove={onRemove} ariaName={label}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold leading-tight">{label}</p>
        <Badge variant="default" className="bg-green-600 text-white">
          <CheckCircle2 className="size-3" /> Jan Aushadhi
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{generic.genericName}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-green-300 bg-green-50/60 p-3 dark:border-green-900 dark:bg-green-950/20">
          <p className="text-[11px] font-medium uppercase tracking-wide text-green-700 dark:text-green-400">
            You pay
          </p>
          <p className="mt-0.5 font-semibold text-green-800 dark:text-green-300">
            {formatINR(generic.mrp)}{" "}
            <span className="text-xs font-normal text-green-700/70 dark:text-green-400/70">
              / pack of {generic.unitSize}
            </span>
          </p>
          <p className="text-xs text-green-700/70 dark:text-green-400/70">
            {formatINR(generic.perUnitPrice)} / {unit}
          </p>
        </div>

        {cheapestBrand ? (
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              vs cheapest brand
            </p>
            <p className="mt-0.5 text-sm">
              <span className="font-medium">{cheapestBrand.brandName}</span>{" "}
              <span className="text-muted-foreground">
                {formatINR(cheapestBrand.mrp)} / {cheapestBrand.packSize}
              </span>
            </p>
            {savingsPerPack > 0 && (
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                {formatINR(savingsPerPack)} cheaper than {cheapestBrand.brandName}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col justify-center rounded-lg border border-dashed p-3">
            <p className="text-xs text-muted-foreground">
              No branded comparison available for this composition.
            </p>
          </div>
        )}
      </div>

      <QtyControl value={item.quantity || 1} onChange={onQuantityChange} name={label} />
    </RowShell>
  );
}

/** A saved BRANDED medicine (kind "brand") — unchanged comparison behavior. */
function BrandFavoriteRow({ item, checked, onToggle, onRemove, onQuantityChange }) {
  const { brand, hasGenericEquivalent, cheapestGeneric } = item;
  const perPackSavings = hasGenericEquivalent ? brand.mrp - cheapestGeneric.mrp : 0;

  return (
    <RowShell checked={checked} onToggle={onToggle} onRemove={onRemove} ariaName={brand.brandName}>
      <p className="font-semibold leading-tight">{brand.brandName}</p>
      <p className="text-xs text-muted-foreground">{brand.composition}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* Branded */}
        <div className="rounded-lg border bg-background p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Branded</p>
          <p className="mt-0.5 font-semibold">
            {formatINR(brand.mrp)}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              / {unitsLabel(brand.packCount, brand.packSize)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {formatINR(brand.perUnitPrice)} / {unitLabelOf(brand.packSize)}
          </p>
        </div>

        {/* Generic or no-equivalent note */}
        {hasGenericEquivalent ? (
          <div className="rounded-lg border border-green-300 bg-green-50/60 p-3 dark:border-green-900 dark:bg-green-950/20">
            <p className="text-[11px] font-medium uppercase tracking-wide text-green-700 dark:text-green-400">
              Jan Aushadhi
            </p>
            <p className="mt-0.5 font-semibold text-green-800 dark:text-green-300">
              {formatINR(cheapestGeneric.mrp)}{" "}
              <span className="text-xs font-normal text-green-700/70 dark:text-green-400/70">
                / {unitsLabel(cheapestGeneric.packCount, brand.packSize)}
              </span>
            </p>
            <p className="text-xs text-green-700/70 dark:text-green-400/70">
              {formatINR(cheapestGeneric.perUnitPrice)} / {unitLabelOf(brand.packSize)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col justify-center rounded-lg border border-dashed p-3">
            <Badge variant="saffron" className="mb-1 w-fit">No generic</Badge>
            <p className="text-xs text-muted-foreground">
              No cheaper generic available — branded price only.
            </p>
          </div>
        )}
      </div>

      {hasGenericEquivalent && (
        <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-400">
          Save {formatINR(perPackSavings)} / pack
        </p>
      )}

      <QtyControl value={item.quantity || 1} onChange={onQuantityChange} name={brand.brandName} />
    </RowShell>
  );
}

/**
 * Quantity stepper (− / n / +). Minimum 1 — removing a row entirely is the
 * trash button's job. Multiplies the row's contribution to the totals.
 */
function QtyControl({ value, onChange, name }) {
  const btn =
    "flex size-7 items-center justify-center rounded-full text-base font-semibold transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="mt-3 inline-flex items-center gap-0.5 rounded-full border bg-background px-1.5 py-0.5">
      <button
        type="button"
        className={btn}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        aria-label={`Decrease quantity of ${name}`}
      >
        −
      </button>
      <span className="w-7 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        className={btn}
        disabled={value >= 99}
        onClick={() => onChange(value + 1)}
        aria-label={`Increase quantity of ${name}`}
      >
        +
      </button>
      <span className="mr-1.5 ml-1 text-xs text-muted-foreground">pack{value === 1 ? "" : "s"}</span>
    </div>
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
        <Row label={`If you'd bought brands (${checkedCount} selected)`} value={formatINR(brandedTotal)} />
        <Row label="Buying Jan Aushadhi" value={formatINR(genericTotal)} valueClass="text-green-700 dark:text-green-400" />

        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center dark:border-green-900 dark:bg-green-950/40">
          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
            <PiggyBank className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Total savings</span>
          </div>
          {/* This page's one animation moment: the live total counts to its new value. */}
          <p className="font-display mt-1 text-4xl font-black text-green-700 dark:text-green-400">
            <CountUp value={savings} format={formatINR} duration={600} />
          </p>
          <p className="text-xs text-green-700/80 dark:text-green-400/80">{savingsPercent}% less than branded</p>
        </div>

        {/* Nudge to act on the savings by visiting a kendra. */}
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
