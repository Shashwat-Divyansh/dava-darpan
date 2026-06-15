import { createContext, useCallback, useContext, useEffect, useState } from "react";

import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * FavoritesContext keeps the user's saved medicines (with full comparison data)
 * available app-wide, so "Add to basket" buttons and the basket page stay in
 * sync without refetching.
 */
const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]); // array of comparison objects
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

  // Set of saved brand ids, for quick "is this saved?" checks in buttons.
  const favoriteIds = new Set(favorites.map((f) => f.brand.id));

  async function addFavorite(brandId) {
    const { data } = await api.post("/favorites", { brandId });
    setFavorites((prev) => (prev.some((f) => f.brand.id === brandId) ? prev : [...prev, data]));
    return data;
  }

  async function removeFavorite(brandId) {
    await api.delete(`/favorites/${brandId}`);
    setFavorites((prev) => prev.filter((f) => f.brand.id !== brandId));
  }

  const value = { favorites, favoriteIds, addFavorite, removeFavorite, refresh, loading };
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside a <FavoritesProvider>");
  return ctx;
}
