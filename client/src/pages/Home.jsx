import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ShoppingBasket } from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AppHeader from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import SearchBar from "@/components/SearchBar";

/**
 * Protected home page. The search bar is the primary action: search a branded
 * medicine to jump to its Jan Aushadhi comparison.
 */
export default function Home() {
  const { user } = useAuth();
  // Live data counts for the stat line (fetched, not hardcoded).
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/medicines/stats");
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(null); // stat line just won't render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Indian-format numbers, e.g. 19380 -> "19,380".
  const fmt = (n) => Number(n).toLocaleString("en-IN");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      {/* Search hero */}
      <main className="mx-auto max-w-5xl px-6 py-20">
        <section className="text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Welcome back{user?.name ? `, ${user.name}` : ""} 👋
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Find the generic.{" "}
            <span className="text-primary">Save on every prescription.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Search a branded medicine to see its Jan Aushadhi (generic) equivalent and exactly how much you&apos;d save.
          </p>

          {stats && (
            <p className="mx-auto mt-2 text-xs text-muted-foreground">
              Comparing {fmt(stats.genericCount)} Jan Aushadhi generics · {fmt(stats.brandCount)} branded medicines ·{" "}
              {fmt(stats.kendraCount)} kendras nationwide.
            </p>
          )}

          <div className="mt-8">
            <SearchBar />
          </div>

          {/* Non-clickable hints to guide the demo */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Try:</span>
            {["Dolo 650", "Combiflam", "Pan-D", "Montair-LC"].map((name) => (
              <Badge key={name} variant="outline" className="font-normal">
                {name}
              </Badge>
            ))}
          </div>
        </section>

        {/* Quick links to the other features */}
        <section className="mx-auto mt-20 grid max-w-2xl gap-6 sm:grid-cols-2">
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
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-sm text-muted-foreground">
          Dava Darpan · Helping Indians find affordable generic medicines · Built by Shashwat · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
