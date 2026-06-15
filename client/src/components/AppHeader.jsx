import { Link, useNavigate } from "react-router-dom";
import { Pill, ShoppingBasket, LogOut } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Shared top nav for protected pages: brand, basket link (with count), logout. */
export default function AppHeader() {
  const { logout } = useAuth();
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
          <span className="text-lg font-bold tracking-tight">Dava Darpan</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/favorites">
              <ShoppingBasket className="size-4" />
              <span className="hidden sm:inline">My Basket</span>
              {favorites.length > 0 && <Badge className="ml-1">{favorites.length}</Badge>}
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
