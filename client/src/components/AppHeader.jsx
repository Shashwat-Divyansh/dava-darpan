import { Link, useNavigate } from "react-router-dom";
import { Pill, ShoppingBasket, MapPin, LogOut, LogIn } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Shared top nav. Shows the app name and "Find Kendra" for everyone.
 * Logged-in users get the basket (with count) and Log out; guests get a basket
 * link that routes to login, plus Log in / Sign up.
 */
export default function AppHeader() {
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Pill className="size-6 text-primary" />
          <span className="font-display text-xl font-bold tracking-tight">Dava Darpan</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/kendras">
              <MapPin className="size-4" />
              <span className="hidden sm:inline">Find Kendra</span>
            </Link>
          </Button>

          {/* Basket: guests are sent to login (it's account-only). */}
          <Button asChild variant="ghost" size="sm">
            <Link to={user ? "/favorites" : "/login?redirect=/favorites"}>
              <ShoppingBasket className="size-4" />
              <span className="hidden sm:inline">My Basket</span>
              {user && favorites.length > 0 && <Badge className="ml-1">{favorites.length}</Badge>}
            </Link>
          </Button>

          {user ? (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">
                  <LogIn className="size-4" />
                  <span className="hidden sm:inline">Log in</span>
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
