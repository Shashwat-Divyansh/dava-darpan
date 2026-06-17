import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Toggle a brand in/out of the savings basket.
 * - Logged in: adds/removes the favorite (heart fills green when saved).
 * - Guest: opens a login/signup modal. Both buttons carry ?redirect=<current
 *   page> so the user returns here after authenticating, then taps save again.
 */
export default function FavoriteButton({ brandId, className }) {
  const { user } = useAuth();
  const { favoriteIds, addFavorite, removeFavorite } = useFavorites();
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false); // guest auth modal
  const location = useLocation();

  const saved = favoriteIds.has(brandId);
  const redirect = encodeURIComponent(location.pathname + location.search);

  async function toggle() {
    // Guests must sign in first — prompt with a modal instead of leaving the page.
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setBusy(true);
    try {
      if (saved) await removeFavorite(brandId);
      else await addFavorite(brandId);
    } catch {
      // e.g. a 409 if it was already added in another tab — safe to ignore.
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={saved ? "default" : "outline"}
        onClick={toggle}
        disabled={busy}
        className={cn(saved && "bg-green-600 hover:bg-green-700", className)}
      >
        <Heart className={cn("size-4", saved && "fill-current")} />
        {saved ? "Saved to basket" : "Add to basket"}
      </Button>

      {/* Guest-only: prompt to log in or sign up, preserving where to return. */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this to your basket</DialogTitle>
            <DialogDescription>
              Create a free account (or log in) to save medicines and track your total savings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Maybe later</Button>
            </DialogClose>
            <Button asChild variant="outline">
              <Link to={`/login?redirect=${redirect}`}>Log in</Link>
            </Button>
            <Button asChild>
              <Link to={`/signup?redirect=${redirect}`}>Sign up</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
