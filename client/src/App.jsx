import { useEffect, useState } from "react";
import { Pill, Search, MapPin, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Placeholder homepage for Phase 1.
 * It also pings the backend's /api/health endpoint to prove the client <-> server
 * wiring works (via the Vite dev proxy). Real features arrive in later phases.
 */
function App() {
  const [health, setHealth] = useState({ state: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        if (!cancelled) setHealth({ state: "ok", data, error: null });
      } catch (err) {
        if (!cancelled) setHealth({ state: "error", data: null, error: err.message });
      }
    }

    checkHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  // The features we'll build in upcoming phases — shown here as a preview.
  const features = [
    { icon: Search, title: "Smart Search", desc: "Autocomplete branded medicines as you type." },
    { icon: Pill, title: "Compare & Save", desc: "See generic equivalents and how much you save." },
    { icon: MapPin, title: "Find Kendras", desc: "Locate nearby Jan Aushadhi stores by PIN or city." },
    { icon: Heart, title: "Favorites", desc: "Save medicines and revisit your search history." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Pill className="size-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">Dava Darpan</span>
          </div>
          <span className="text-sm text-muted-foreground">Generic medicine, smarter choices</span>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6 py-16">
        <section className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Compare medicines.<br />
            <span className="text-primary">Save money on every prescription.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Dava Darpan helps you find the Jan Aushadhi (generic) equivalent of branded
            medicines and locate the nearest Jan Aushadhi kendra.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg">Get Started</Button>
            <Button size="lg" variant="outline">Learn More</Button>
          </div>

          {/* Backend health indicator — confirms the API connection works */}
          <div className="mt-6 text-sm">
            {health.state === "loading" && (
              <span className="text-muted-foreground">Checking backend connection…</span>
            )}
            {health.state === "ok" && (
              <span className="text-green-600">
                ● Backend connected — DB: {health.data.database}
              </span>
            )}
            {health.state === "error" && (
              <span className="text-destructive">
                ● Backend not reachable ({health.error}). Is the server running?
              </span>
            )}
          </div>
        </section>

        {/* Feature preview cards */}
        <section className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <Icon className="size-8 text-primary" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-sm text-muted-foreground">
          Dava Darpan · A student project · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

export default App;
