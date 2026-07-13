import { createContext, useCallback, useContext, useEffect, useState } from "react";

import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * FavoritesContext keeps the user's basket rows available app-wide.
 * Rows come in two kinds (see server/models/Favorite.js):
 *  - "brand":   a specific branded medicine (has row.brand)
 *  - "generic": the Jan Aushadhi generic for a composition (has row.compositionKey)
 */
const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]); // array of basket rows
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/favorites");
      setFavorites(data.favorites);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load when a user logs in; clear when they log out.
  useEffect(() => {
    if (user) refresh();
    else setFavorites([]);
  }, [user, refresh]);

  // Quick "is this saved?" lookups for the two kinds of add buttons.
  const savedBrandIds = new Set(
    favorites.filter((f) => f.kind === "brand").map((f) => f.brand.id)
  );
  const savedGenericKeys = new Set(
    favorites.filter((f) => f.kind === "generic").map((f) => f.compositionKey)
  );

  async function addBrand(brandId) {
    const { data } = await api.post("/favorites", { brandId });
    setFavorites((prev) =>
      prev.some((f) => f.kind === "brand" && f.brand.id === brandId) ? prev : [...prev, data]
    );
    return data;
  }

  async function addGeneric(compositionKey) {
    const { data } = await api.post("/favorites", { compositionKey });
    setFavorites((prev) =>
      prev.some((f) => f.kind === "generic" && f.compositionKey === compositionKey)
        ? prev
        : [...prev, data]
    );
    return data;
  }

  async function removeByFavoriteId(favoriteId) {
    await api.delete(`/favorites/${favoriteId}`);
    setFavorites((prev) => prev.filter((f) => f.favoriteId !== favoriteId));
  }

  /** Set how many packs a row counts for. Optimistic; re-syncs on failure. */
  async function updateQuantity(favoriteId, quantity) {
    setFavorites((prev) =>
      prev.map((f) => (f.favoriteId === favoriteId ? { ...f, quantity } : f))
    );
    try {
      await api.patch(`/favorites/${favoriteId}`, { quantity });
    } catch {
      refresh(); // server rejected (or offline) — restore the truth
    }
  }

  /** Remove by what the UI knows (brand id / composition key). */
  async function removeBrand(brandId) {
    const row = favorites.find((f) => f.kind === "brand" && f.brand.id === brandId);
    if (row) await removeByFavoriteId(row.favoriteId);
  }
  async function removeGeneric(compositionKey) {
    const row = favorites.find((f) => f.kind === "generic" && f.compositionKey === compositionKey);
    if (row) await removeByFavoriteId(row.favoriteId);
  }

  const value = {
    favorites,
    savedBrandIds,
    savedGenericKeys,
    addBrand,
    addGeneric,
    removeBrand,
    removeGeneric,
    removeByFavoriteId,
    updateQuantity,
    refresh,
    loading,
  };
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside a <FavoritesProvider>");
  return ctx;
}
