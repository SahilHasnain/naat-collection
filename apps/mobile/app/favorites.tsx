import EmptyState from "@/components/EmptyState";
import NaatCard from "@/components/NaatCard";
import NaatCardMenu from "@/components/NaatCardMenu";
import { colors } from "@/constants/theme";
import { useFavorites } from "@/hooks/useFavorites";
import { useNaatPlayback } from "@/hooks/useNaatPlayback";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";
import { appwriteService } from "@/services/appwrite";
import type { MenuAnchor, Naat } from "@/types";
import { getPreferredDuration } from "@naat-collection/shared";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  Text,
  View,
} from "react-native";

export default function FavoritesScreen() {
  const { columns, maxContentWidth } = useResponsiveColumns();
  const {
    favoriteIds,
    loading: favoritesLoading,
    isFavorite,
    toggleFavorite,
    refresh,
  } =
    useFavorites();
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedNaat, setSelectedNaat] = useState<Naat | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const { handleNaatPress } = useNaatPlayback(naats);

  const loadFavorites = useCallback(async () => {
    if (favoriteIds.length === 0) {
      setNaats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        favoriteIds.map((naatId) =>
          appwriteService.getNaatById(naatId).catch(() => null),
        ),
      );
      setNaats(results.filter((naat): naat is Naat => naat !== null));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError
          : new Error("Failed to load favorites"),
      );
    } finally {
      setLoading(false);
    }
  }, [favoriteIds]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    await loadFavorites();
    setRefreshing(false);
  }, [loadFavorites, refresh]);

  const closeMenu = useCallback(() => {
    setSelectedNaat(null);
    setMenuAnchor(null);
  }, []);

  const handleMenuPress = useCallback((naat: Naat, anchor: MenuAnchor) => {
    setSelectedNaat(naat);
    setMenuAnchor(anchor);
  }, []);

  const handleToggleFavorite = useCallback(() => {
    if (!selectedNaat) return;
    const naatId = selectedNaat.$id;
    closeMenu();
    void toggleFavorite(naatId);
  }, [closeMenu, selectedNaat, toggleFavorite]);

  const renderItem = useCallback<ListRenderItem<Naat>>(
    ({ item, index }) => {
      const isYouTube = columns === 1;
      return (
        <View
          style={
            isYouTube
              ? { flex: 1 }
              : {
                  flex: 1,
                  marginLeft: index % columns === 0 ? 16 : 6,
                  marginRight: index % columns === 0 ? 6 : 16,
                }
          }
        >
          <NaatCard
            id={item.$id}
            title={item.title}
            thumbnail={item.thumbnailUrl}
            duration={getPreferredDuration(item)}
            uploadDate={item.uploadDate}
            channelName={item.channelName}
            views={item.views}
            onPress={() => handleNaatPress(item.$id)}
            onMenuPress={(anchor) => handleMenuPress(item, anchor)}
            isCut={!!item.cutAudio}
            variant={isYouTube ? "youtube" : "grid"}
          />
        </View>
      );
    },
    [columns, handleMenuPress, handleNaatPress],
  );

  const isEmpty = !loading && !favoritesLoading && naats.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <Text
        style={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 16,
          color: colors.text.primary,
          fontSize: 24,
          fontWeight: "700",
        }}
      >
        Favorites
      </Text>

      {loading || favoritesLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.accent.secondary} />
        </View>
      ) : error ? (
        <EmptyState
          message="Unable to load favorites. Please try again."
          iconName="alert-circle"
          actionLabel="Retry"
          onAction={loadFavorites}
        />
      ) : isEmpty ? (
        <EmptyState
          message="No favorites yet. Tap the heart on a naat to save it here."
          iconName="heart-outline"
        />
      ) : (
        <FlatList
          data={naats}
          key={`favorites-${columns}`}
          renderItem={renderItem}
          keyExtractor={(item) => item.$id}
          numColumns={columns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            width: "100%",
            maxWidth: maxContentWidth,
            alignSelf: "center",
            paddingBottom: 100,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.accent.secondary]}
              tintColor={colors.accent.secondary}
            />
          }
        />
      )}

      <NaatCardMenu
        visible={menuAnchor !== null && selectedNaat !== null}
        anchor={menuAnchor}
        selectedNaat={selectedNaat}
        savedPlaybackMode="audio"
        onClose={closeMenu}
        onAlternatePlay={() => closeMenu()}
        isFavorite={selectedNaat ? isFavorite(selectedNaat.$id) : false}
        onToggleFavorite={handleToggleFavorite}
        showDownload={false}
      />
    </View>
  );
}
