import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ShoppingBasket, Search, ListOrdered, CheckCircle2, ArrowRight } from "lucide-react";

import api from "@/lib/api";
import { formatINR, unitLabel } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";
import AppHeader from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import SearchBar from "@/components/SearchBar";

// The composition used for the homepage's live example. Only the KEY is fixed —
// all prices/brands are fetched from the database, never hardcoded.
const EXAMPLE_KEY = "paracetamol|650mg";

/**
 * Homepage. A first-time visitor must instantly get it:
 * hero states the payoff → the search bar is the action → a LIVE example
 * comparison shows the value before they type anything → how it works → stats.
 */
export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [example, setExample] = useState(null); // live comparison preview data

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/medicines/stats");
        if (!cancelled) setStats(data);
      } catch {
        /* stat line just won't render */
      }
    })();
    (async () => {
      try {
        const { data } = await api.get(`/medicines/compare/${encodeURIComponent(EXAMPLE_KEY)}`);
        // Only show the preview when it can honestly demonstrate savings.
        if (!cancelled && data.hasGeneric && data.brands.length > 0) setExample(data);
      } catch {
        /* example section just won't render */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n) => Number(n).toLocaleString("en-IN");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-16">
        {/* ---------- HERO ---------- */}
        <section className="text-center">
          {user && (
            <p className="mb-3 text-sm text-muted-foreground">Welcome back, {user.name} 👋</p>
          )}
          <h1 className="font-display mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            The same medicine. <span className="text-primary">Up to 70% cheaper.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">
            Branded medicines have Jan Aushadhi generic equivalents — the same composition, sold at
            government-set prices. Dava Darpan shows you both, side by side.
          </p>

          {/* THE hero action */}
          <div className="mt-9">
            <SearchBar />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Try:</span>
            {["Paracetamol 650", "Dolo", "Combiflam", "Telmisartan"].map((name) => (
              <Badge key={name} variant="saffron" className="font-medium">
                {name}
              </Badge>
            ))}
          </div>
        </section>

        {/* ---------- LIVE EXAMPLE (real data, true preview) ---------- */}
        {example && <LiveExample data={example} />}

        {/* ---------- HOW IT WORKS ---------- */}
        <section className="mx-auto mt-24 max-w-3xl">
          <h2 className="font-display text-center text-2xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Search,
                step: "1",
                title: "Search your prescription",
                desc: "Type the composition on your strip — or the brand name you know.",
              },
              {
                icon: ListOrdered,
                step: "2",
                title: "See every option, ranked",
                desc: "All brands and the Jan Aushadhi price for that exact composition and strength.",
              },
              {
                icon: MapPin,
                step: "3",
                title: "Buy it near you",
                desc: "Find a Jan Aushadhi kendra by PIN code or district.",
              },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Step {step}
                </p>
                <h3 className="mt-1 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- QUICK LINKS ---------- */}
        <section className="mx-auto mt-24 grid max-w-2xl gap-6 sm:grid-cols-2">
          {[
            { icon: MapPin, title: "Find a Kendra", desc: "Locate nearby Jan Aushadhi stores by PIN or district.", to: "/kendras" },
            { icon: ShoppingBasket, title: "My Basket", desc: "Track your saved medicines and total savings.", to: "/favorites" },
          ].map(({ icon: Icon, title, desc, to }) => (
            <Link
              key={title}
              to={to}
              className="rounded-xl border bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <Icon className="size-5 text-primary" />
                <h3 className="font-semibold">{title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </section>

        {/* ---------- STATS (closes the page) ---------- */}
        {stats && (
          <p className="mt-16 text-center text-xs text-muted-foreground">
            Comparing {fmt(stats.genericCount)} Jan Aushadhi generics · {fmt(stats.kendraCount)}{" "}
            kendras nationwide.
          </p>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-sm text-muted-foreground">
          Dava Darpan · Helping Indians find affordable generic medicines · Built by Shashwat ·{" "}
          {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

/**
 * A REAL comparison, fetched from the DB, that visually mirrors the comparison
 * page — so visitors see the value before typing anything.
 */
function LiveExample({ data }) {
  const { label, generic, brands, compositionKey, savingsPercentUnit } = data;
  const cheapestBrand = brands[0]; // ranked by per-tablet price
  const unit = unitLabel(cheapestBrand.packSize);

  return (
    <section className="mx-auto mt-24 max-w-3xl">
      <h2 className="font-display text-center text-2xl font-bold tracking-tight">
        A real example: {label}
      </h2>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Live prices from our data — this is exactly what a comparison looks like.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Branded (cheapest of the ranked list) */}
        <Card>
          <CardContent className="py-5">
            <Badge variant="secondary">Cheapest branded</Badge>
            <p className="mt-2 font-semibold">{cheapestBrand.brandName}</p>
            {cheapestBrand.manufacturer && (
              <p className="text-xs text-muted-foreground">{cheapestBrand.manufacturer}</p>
            )}
            <div className="font-display mt-3 text-3xl font-bold">
              {formatINR(cheapestBrand.mrp)}
              <span className="font-sans text-sm font-medium text-muted-foreground">
                {" "}
                / {cheapestBrand.packSize}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatINR(cheapestBrand.perUnitPrice)} per {unit}
            </p>
          </CardContent>
        </Card>

        {/* Jan Aushadhi */}
        <Card className="border-green-300 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="py-5">
            <Badge variant="default" className="bg-green-600 text-white">
              <CheckCircle2 className="size-3" /> Jan Aushadhi
            </Badge>
            <p className="mt-2 font-semibold">{generic.genericName}</p>
            <p className="text-xs text-muted-foreground">Pack of {generic.unitSize}</p>
            <div className="font-display mt-3 text-3xl font-bold text-green-700 dark:text-green-400">
              {formatINR(generic.mrp)}
              <span className="font-sans text-sm font-medium text-muted-foreground">
                {" "}
                / pack
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatINR(generic.perUnitPrice)} per {unit} —{" "}
              <span className="font-semibold text-green-700 dark:text-green-400">
                {savingsPercentUnit}% cheaper
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 text-center">
        <Link
          to={`/compare/${encodeURIComponent(compositionKey)}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          See the full comparison ({brands.length} brands) <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
