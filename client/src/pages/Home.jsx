import { useNavigate } from "react-router-dom";
import { Pill, Search, MapPin, Heart, LogOut } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * Protected home page. Only reachable when logged in (see <ProtectedRoute>).
 * Greets the user and offers a logout button; the feature cards preview what's
 * coming in later phases.
 */
export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const features = [
    { icon: Search, title: "Smart Search", desc: "Autocomplete branded medicines as you type." },
    { icon: Pill, title: "Compare & Save", desc: "See generic equivalents and how much you save." },
    { icon: MapPin, title: "Find Kendras", desc: "Locate nearby Jan Aushadhi stores by PIN or city." },
    { icon: Heart, title: "Favorites", desc: "Save medicines and revisit your search history." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar with greeting + logout */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Pill className="size-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">Dava Darpan</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Welcome, <span className="font-medium text-foreground">{user?.name}</span>
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6 py-16">
        <section className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Welcome, {user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            You&apos;re logged in. Soon you&apos;ll be able to compare branded medicines with their
            Jan Aushadhi generics and find the nearest kendra. Here&apos;s what&apos;s coming:
          </p>
        </section>

        {/* Feature preview cards */}
        <section className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
