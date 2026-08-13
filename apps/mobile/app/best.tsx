import EmptyState from "@/components/EmptyState";
import FloatingFilterButton from "@/components/FloatingFilterButton";
import NaatActionSheet from "@/components/NaatActionSheet";
import NaatCard from "@/components/NaatCard";
import { colors } from "@/constants/theme";
import { useFilterModal } from "@/contexts/FilterModalContext";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext.animated";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { useNaatPlayback } from "@/hooks/useNaatPlayback";
import { storageService } from "@/services/storage";
import { appwriteService } from "@/services/appwrite";
import type { Naat } from "@/types";
import { getPreferredDuration } from "@naat-collection/shared";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

const POPULAR_FETCH_LIMIT = 500;
const BEST_COUNT = 100;
const NUM_COLUMNS = 2;

function shuffleAndPick(naats: Naat[], count: number): Naat[] {
  const shuffled = [...naats];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export default function BestScreen() {
  const flatListRef = useRef<FlatList>(null);
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedNaat, setSelectedNaat] = useState<Naat | null>(null);
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [savedPlaybackMode, setSavedPlaybackMode] = useState<"audio" | "video">(
    "audio",
  );

  const { handleScroll: handleTabBarScroll, showTabBar } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll, showHeader } =
    useHeaderVisibility();
  const { setShowFilterModal } = useFilterModal();

  const { downloadStates, handleDownload } = useDownloadManager(naats);
  const { handleNaatPress, playAsAudio, playAsVideo } = useNaatPlayback(naats);

  const loadBest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const popular = await appwriteService.getNaats(
        POPULAR_FETCH_LIMIT,
        0,
        "popular",
      );
      setNaats(shuffleAndPick(popular, BEST_COUNT));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load naats"));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const popular = await appwriteService.getNaats(
        POPULAR_FETCH_LIMIT,
        0,
        "popular",
      );
      setNaats(shuffleAndPick(popular, BEST_COUNT));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to refresh naats"));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      showTabBar();
      showHeader();
    }, [showTabBar, showHeader]),
  );

  useEffect(() => {
    loadBest();
  }, [loadBest]);

  const handleScroll = (event: any) => {
    handleTabBarScroll(event);
    handleHeaderScroll(event);
  };

  const closeActionSheet = useCallback(() => {
    setIsActionSheetVisible(false);
    setSelectedNaat(null);
  }, []);

  const handleCardLongPress = useCallback(async (naat: Naat) => {
    setSelectedNaat(naat);
    setIsActionSheetVisible(true);

    void (async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log("Haptics unavailable:", error);
      }

      try {
        const mode = (await storageService.loadPlaybackMode()) || "audio";
        setSavedPlaybackMode(mode);
      } catch (error) {
        console.log("Failed to load playback mode:", error);
        setSavedPlaybackMode("audio");
      }
    })();
  }, []);

  const handleDownloadFromSheet = useCallback(async () => {
    if (!selectedNaat) return;
    closeActionSheet();
    await handleDownload(selectedNaat);
  }, [closeActionSheet, handleDownload, selectedNaat]);

  const handleAlternatePlay = useCallback(async () => {
    if (!selectedNaat) return;
    closeActionSheet();

    if (savedPlaybackMode === "audio") {
      await storageService.savePlaybackMode("video").catch(() => {});
      await playAsVideo(selectedNaat.$id);
      return;
    }

    await storageService.savePlaybackMode("audio").catch(() => {});
    await playAsAudio(selectedNaat.$id);
  }, [
    closeActionSheet,
    playAsAudio,
    playAsVideo,
    savedPlaybackMode,
    selectedNaat,
  ]);

  const renderNaatCard = React.useCallback<ListRenderItem<Naat>>(
    ({ item, index }) => {
      const ds = downloadStates[item.$id];
      const isLeftColumn = index % NUM_COLUMNS === 0;

      return (
        <View
          style={{
            flex: 1,
            marginLeft: isLeftColumn ? 16 : 6,
            marginRight: isLeftColumn ? 6 : 16,
          }}
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
            onLongPress={() => handleCardLongPress(item)}
            onDownload={() => handleDownload(item)}
            isDownloaded={ds?.isDownloaded}
            isDownloading={ds?.isDownloading}
            downloadProgress={ds?.progress}
            isCut={!!item.cutAudio}
          />
        </View>
      );
    },
    [
      handleNaatPress,
      handleCardLongPress,
      handleDownload,
      downloadStates,
    ],
  );

  const renderEmptyState = () => {
    if (loading && naats.length === 0) {
      return (
        <View className="items-center justify-center flex-1 py-20">
          <ActivityIndicator size="large" color={colors.accent.secondary} />
          <Text className="mt-4 text-base text-neutral-400">
            Loading best naats...
          </Text>
        </View>
      );
    }
    if (error && naats.length === 0) {
      return (
        <EmptyState
          message="Unable to connect. Please check your internet connection."
          iconName="alert-circle"
          actionLabel="Retry"
          onAction={refresh}
        />
      );
    }
    if (naats.length === 0) {
      return (
        <EmptyState
          message="No naats available yet. Check back soon!"
          iconName="musical-notes"
        />
      );
    }
    return null;
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background.primary }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(0, 0, 0, 0.52)",
          "rgba(6, 10, 20, 0.3)",
          "rgba(0, 0, 0, 0.12)",
          "rgba(0, 0, 0, 0.4)",
        ]}
        locations={[0, 0.2, 0.56, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-1">
        <FlatList
          key={`best-grid-${NUM_COLUMNS}`}
          ref={flatListRef}
          data={naats}
          renderItem={renderNaatCard}
          keyExtractor={(item) => item.$id}
          numColumns={NUM_COLUMNS}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 100,
            paddingBottom: 120,
          }}
          ListEmptyComponent={renderEmptyState}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[colors.accent.secondary]}
              tintColor={colors.accent.secondary}
            />
          }
          removeClippedSubviews={false}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          columnWrapperStyle={{ alignItems: "flex-start" }}
        />
      </View>

      <FloatingFilterButton
        onPress={() => setShowFilterModal(true)}
        hasActiveFilters={false}
      />

      <NaatActionSheet
        visible={isActionSheetVisible}
        selectedNaat={selectedNaat}
        savedPlaybackMode={savedPlaybackMode}
        onClose={closeActionSheet}
        onDownload={handleDownloadFromSheet}
        onAlternatePlay={handleAlternatePlay}
        isDownloaded={selectedNaat ? downloadStates[selectedNaat.$id]?.isDownloaded : false}
        showDownload={true}
      />
    </View>
  );
}
