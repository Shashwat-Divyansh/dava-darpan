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
 * Add-to-basket toggle, two targets:
 *  - <FavoriteButton brandId={id} />            saves a SPECIFIC brand
 *  - <FavoriteButton compositionKey={key} />    saves the JAN AUSHADHI generic
 * `compact` renders an icon-only heart (used on brand rows).
 * Guests get a login/signup modal preserving the current page as ?redirect=.
 */
export default function FavoriteButton({ brandId, compositionKey, compact = false, className }) {
  const isGenericTarget = !brandId && !!compositionKey;
  const { user } = useAuth();
  const {
    savedBrandIds,
    savedGenericKeys,
    addBrand,
    addGeneric,
    removeBrand,
    removeGeneric,
  } = useFavorites();
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false); // guest auth modal
  const location = useLocation();

  const saved = isGenericTarget ? savedGenericKeys.has(compositionKey) : savedBrandIds.has(brandId);
  const redirect = encodeURIComponent(location.pathname + location.search);

  async function toggle() {
    // Guests must sign in first — prompt with a modal instead of leaving the page.
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setBusy(true);
    try {
      if (isGenericTarget) {
        if (saved) await removeGeneric(compositionKey);
        else await addGeneric(compositionKey);
      } else {
        if (saved) await removeBrand(brandId);
        else await addBrand(brandId);
      }
    } catch {
      // e.g. a 409 if it was already added in another tab — safe to ignore.
    } finally {
      setBusy(false);
    }
  }

  const label = isGenericTarget
    ? saved
      ? "Jan Aushadhi in basket"
      : "Add Jan Aushadhi to basket"
    : saved
      ? "Saved to basket"
      : "Add to basket";

  return (
    <>
      {compact ? (
        /* Compact: icon-only heart, used on per-brand rows of the comparison. */
        <Button
          type="button"
          variant={saved ? "default" : "outline"}
          size="icon"
          onClick={toggle}
          disabled={busy}
          aria-label={saved ? "Remove from basket" : "Add to basket"}
          title={saved ? "Remove from basket" : "Add to basket"}
          className={cn(saved && "bg-green-600 hover:bg-green-700", className)}
        >
          <Heart className={cn("size-4", saved && "fill-current")} />
        </Button>
      ) : (
        <Button
          type="button"
          variant={saved ? "default" : "outline"}
          onClick={toggle}
          disabled={busy}
          className={cn(
            saved && "bg-green-600 hover:bg-green-700",
            // Generic add button sits on the green card — keep it readable.
            isGenericTarget && !saved && "border-green-600/40 bg-white/60 dark:bg-transparent",
            className
          )}
        >
          <Heart className={cn("size-4", saved && "fill-current")} />
          {label}
        </Button>
      )}

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
