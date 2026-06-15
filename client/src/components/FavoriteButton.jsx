import { useState } from "react";
import { Heart } from "lucide-react";

import { useFavorites } from "@/context/FavoritesContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Toggle a brand in/out of the savings basket. Reflects saved state app-wide via
 * FavoritesContext (heart outline = not saved, filled green = saved).
 */
export default function FavoriteButton({ brandId, className }) {
  const { favoriteIds, addFavorite, removeFavorite } = useFavorites();
  const [busy, setBusy] = useState(false);
  const saved = favoriteIds.has(brandId);

  async function toggle() {
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
  );
}
