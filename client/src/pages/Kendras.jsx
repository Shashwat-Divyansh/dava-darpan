import { useEffect, useState } from "react";
import { MapPin, Search, Building2, Loader2 } from "lucide-react";

import api from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Shared styling for the native <select> dropdowns (kept consistent with Input).
const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Kendra finder. Two data-driven ways to search: by 6-digit PIN, or by
 * State → District dropdowns (districts load from the API based on the state).
 */
export default function Kendras() {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [result, setResult] = useState(null); // { kendras, count, total, capped, label }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load the list of states once.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/kendras/states");
        setStates(data.states);
      } catch {
        setStates([]);
      }
    })();
  }, []);

  // Load districts whenever the chosen state changes.
  useEffect(() => {
    if (!selectedState) {
      setDistricts([]);
      setSelectedDistrict("");
      return;
    }
    (async () => {
      try {
        const { data } = await api.get("/kendras/districts", { params: { state: selectedState } });
        setDistricts(data.districts);
      } catch {
        setDistricts([]);
      }
      setSelectedDistrict("");
    })();
  }, [selectedState]);

  async function runSearch(params, label) {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.get("/kendras/search", { params });
      setResult({ ...data, label });
    } catch (err) {
      setError(err.response?.data?.error || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function searchByPin(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin.trim())) {
      setPinError("Enter a valid 6-digit PIN code.");
      return;
    }
    setPinError("");
    runSearch({ pin: pin.trim() }, `PIN ${pin.trim()}`);
  }

  function searchByRegion(e) {
    e.preventDefault();
    if (!selectedState) return;
    const label = selectedDistrict ? `${selectedDistrict}, ${selectedState}` : selectedState;
    runSearch(
      { state: selectedState, ...(selectedDistrict ? { district: selectedDistrict } : {}) },
      label
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="font-display flex items-center gap-2 text-3xl font-bold tracking-tight">
            <MapPin className="size-6 text-primary" />
            Find a Jan Aushadhi Kendra near you
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search by PIN code, or pick your state and district to see nearby generic-medicine stores.
          </p>
        </header>

        {/* Two search methods */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* By PIN */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search by PIN code</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={searchByPin} className="space-y-2">
                <Label htmlFor="pin">6-digit PIN code</Label>
                <div className="flex gap-2">
                  <Input
                    id="pin"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    aria-invalid={!!pinError}
                    placeholder="e.g. 517325"
                  />
                  <Button type="submit">
                    <Search className="size-4" /> Search
                  </Button>
                </div>
                {pinError && <p className="text-sm text-destructive">{pinError}</p>}
              </form>
            </CardContent>
          </Card>

          {/* By state/district */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search by state &amp; district</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={searchByRegion} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State</Label>
                    <select
                      id="state"
                      className={selectClass}
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                    >
                      <option value="">Select state…</option>
                      {states.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="district">District</Label>
                    <select
                      id="district"
                      className={selectClass}
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      disabled={!selectedState}
                    >
                      <option value="">All districts</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button type="submit" disabled={!selectedState} className="w-full">
                  <Search className="size-4" /> Find kendras
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <section className="mt-8">
          {loading && <ResultsSkeleton />}
          {!loading && error && <p className="text-destructive">{error}</p>}
          {!loading && !error && result && <Results result={result} />}
        </section>
      </main>
    </div>
  );
}

function Results({ result }) {
  const { kendras, count, total, capped, label } = result;

  if (count === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <MapPin className="size-9 text-muted-foreground" />
          <h2 className="font-semibold">No kendras found for {label}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Try a nearby PIN code, or search by district instead — the official list may not cover every PIN.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        {capped
          ? `Showing first ${count} of ${total} kendras for ${label}`
          : `${count} kendra${count === 1 ? "" : "s"} found for ${label}`}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {kendras.map((k) => (
          <Card key={k.kendraCode}>
            <CardContent className="flex gap-3 p-4">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Jan Aushadhi Kendra
                </p>
                <p className="font-semibold leading-tight">{k.name || "Unnamed kendra"}</p>
                {k.address && <p className="mt-1 text-sm text-muted-foreground">{k.address}</p>}
                <p className="mt-1 text-sm">
                  {k.district}
                  {k.district && k.state ? ", " : ""}
                  {k.state}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="saffron">PIN {k.pinCode}</Badge>
                  <span className="text-xs text-muted-foreground">{k.kendraCode}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}
