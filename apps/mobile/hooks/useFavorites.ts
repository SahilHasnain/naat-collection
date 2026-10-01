import { storageService } from "@/services/storage";
import React, { useCallback, useEffect, useState } from "react";

interface UseFavoritesResult {
  favoriteIds: string[];
  loading: boolean;
  isFavorite: (naatId: string) => boolean;
  toggleFavorite: (naatId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useFavorites = (): UseFavoritesResult => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setFavoriteIds(await storageService.getFavoriteNaatIds());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isFavorite = useCallback(
    (naatId: string) => favoriteIds.includes(naatId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (naatId: string) => {
      const nextValue = !favoriteIds.includes(naatId);
      setFavoriteIds((currentIds) =>
        nextValue
          ? [...currentIds, naatId]
          : currentIds.filter((id) => id !== naatId),
      );

      try {
        await storageService.setFavoriteNaat(naatId, nextValue);
      } catch {
        await refresh();
      }
    },
    [favoriteIds, refresh],
  );

  return { favoriteIds, loading, isFavorite, toggleFavorite, refresh };
};
