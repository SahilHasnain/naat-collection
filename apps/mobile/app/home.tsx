import EmptyState from "@/components/EmptyState";
import NaatCard from "@/components/NaatCard";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import UnifiedFilterBar from "@/components/UnifiedFilterBar";
import { colors } from "@/constants/theme";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext.animated";
import { useSearch as useSearchContext } from "@/contexts/SearchContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { useHomeFilters } from "@/hooks/useHomeFilters";
import { useNaatPlayback } from "@/hooks/useNaatPlayback";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import type { Naat } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { getPreferredDuration } from "@naat-collection/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const flatListRef = useRef<FlatList>(null);

  // First-time hint state
  const [showDownloadHint, setShowDownloadHint] = useState(false);

  // Contexts
  const {
    isSearchActive,
    deactivateSearch,
    searchInput,
    setSearchInput,
    activeSearchQuery,
    setActiveSearchQuery,
    submitSearch,
  } = useSearchContext();
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll, showHeader } =
    useHeaderVisibility();

  // Custom hooks
  const filters = useHomeFilters();
  const { setQuery, resetSearchFilters, loadMore, isShowingSearchResults } =
    filters;
  const { downloadStates, handleDownload } = useDownloadManager(
    filters.displayData,
  );
  const { handleNaatPress } = useNaatPlayback(filters.displayData);

  // Search suggestions
  const { suggestions, updateSuggestions, addToHistory } = useSearchSuggestions(
    {
      naats: filters.naats,
      maxSuggestions: 10,
    },
  );

  const showSuggestionsOverlay = isSearchActive && !activeSearchQuery;

  const checkFirstTimeHint = useCallback(async () => {
    try {
      const hasSeenHint = await AsyncStorage.getItem(
        "naat_card_download_hint-shown",
      );
      if (!hasSeenHint && filters.displayData.length > 0) {
        // Show hint after a short delay to let the UI settle
        setTimeout(() => {
          setShowDownloadHint(true);
          // Auto-hide hint after 5 seconds
          setTimeout(() => {
            setShowDownloadHint(false);
          }, 5000);
        }, 1000);
      }
    } catch (error) {
      console.log("Error checking first-time hint:", error);
    }
  }, [filters.displayData.length]);

  const dismissHint = useCallback(async () => {
    try {
      await AsyncStorage.setItem("naat_card_download_hint-shown", "true");
      setShowDownloadHint(false);
    } catch (error) {
      console.log("Error saving hint preference:", error);
    }
  }, []);

  // Check for first-time hint on mount
  useEffect(() => {
    checkFirstTimeHint();
  }, [checkFirstTimeHint]);

  // --- Search orchestration effects ---

  useEffect(() => {
    if (isSearchActive) updateSuggestions(searchInput);
  }, [searchInput, isSearchActive, updateSuggestions]);

  useEffect(() => {
    if (activeSearchQuery && searchInput !== activeSearchQuery) {
      setActiveSearchQuery("");
    }
  }, [searchInput, activeSearchQuery, setActiveSearchQuery]);

  useEffect(() => {
    if (activeSearchQuery) {
      setQuery(activeSearchQuery);
      addToHistory(activeSearchQuery);
    } else {
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearchQuery]);

  useEffect(() => {
    if (!isSearchActive) {
      resetSearchFilters();
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchActive]);

  useEffect(() => {
    if (isSearchActive) showHeader();
  }, [isSearchActive, showHeader]);

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [isShowingSearchResults]);

  useFocusEffect(
    useCallback(() => {
      showHeader();
    }, [showHeader]),
  );

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.selectedFilter, filters.selectedChannelId, filters.pureOnly]);

  // Android back button
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isSearchActive) {
        deactivateSearch();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isSearchActive, deactivateSearch]);

  // --- Handlers ---

  const handleRefresh = async () => {
    await Promise.all([filters.refresh(), filters.refreshChannels()]);
  };

  const handleScroll = (event: any) => {
    handleTabBarScroll(event);
    if (!isSearchActive) handleHeaderScroll(event);
  };

  // --- Render helpers ---

  const renderNaatCard = React.useCallback(
    ({ item, index }: { item: Naat; index: number }) => {
      const ds = downloadStates[item.$id];
      const isFirstCard = index === 0;

      return (
        <View>
          {/* First-time hint - only on first card */}
          {isFirstCard && showDownloadHint && (
            <View className="mx-4 mb-3">
              <View
                className="rounded-lg px-3 py-2.5 flex-row items-center"
                style={{ backgroundColor: colors.accent.primary }}
              >
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={colors.text.primary}
                />
                <Text
                  className="text-xs font-medium ml-2 flex-1"
                  style={{ color: colors.text.primary }}
                >
                  Long press any card to download for offline listening
                </Text>
                <TouchableOpacity onPress={dismissHint} className="ml-2 p-1">
                  <Ionicons
                    name="close"
                    size={18}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <NaatCard
            id={item.$id}
            title={item.title}
            thumbnail={item.thumbnailUrl}
            duration={getPreferredDuration(item)}
            uploadDate={item.uploadDate}
            channelName={item.channelName}
            views={item.views}
            onPress={() => handleNaatPress(item.$id)}
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
      handleDownload,
      downloadStates,
      showDownloadHint,
      dismissHint,
    ],
  );

  const renderFooter = () => {
    if (
      !filters.loading ||
      filters.isShowingSearchResults ||
      filters.displayData.length === 0
    ) {
      return null;
    }
    return (
      <View className="py-6">
        <ActivityIndicator size="small" color={colors.accent.secondary} />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (filters.isLoading && filters.displayData.length === 0) {
      return (
        <View className="items-center justify-center flex-1 py-20">
          <ActivityIndicator size="large" color={colors.accent.secondary} />
          <Text className="mt-4 text-base text-neutral-400">
            {filters.isShowingSearchResults
              ? "Searching..."
              : "Loading naats..."}
          </Text>
        </View>
      );
    }
    if (filters.error && filters.displayData.length === 0) {
      return (
        <EmptyState
          message="Unable to connect. Please check your internet connection."
          iconName="alert-circle"
          actionLabel="Retry"
          onAction={handleRefresh}
        />
      );
    }
    if (filters.isShowingSearchResults && filters.displayData.length === 0) {
      return (
        <EmptyState
          message="No naats found matching your search."
          iconName="search"
        />
      );
    }
    if (filters.displayData.length === 0) {
      return (
        <EmptyState
          message="No naats available yet. Check back soon!"
          iconName="musical-notes"
        />
      );
    }
    return null;
  };

  // --- JSX ---

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
          ref={flatListRef}
          data={filters.displayData}
          renderItem={renderNaatCard}
          keyExtractor={(item) => item.$id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 100,
            paddingBottom: 120,
          }}
          ListHeaderComponent={
            <>
              {filters.isShowingSearchResults ? (
                <>
                  <SearchFilterBar
                    channels={filters.channels}
                    selectedChannelId={filters.searchChannelId}
                    onChannelChange={filters.setSearchChannelId}
                    selectedDuration={filters.searchDuration}
                    onDurationChange={filters.setSearchDuration}
                    pureOnly={filters.searchPureOnly}
                    onPureOnlyChange={filters.setSearchPureOnly}
                  />
                  <View style={{ height: 12 }} />
                </>
              ) : !isSearchActive ? (
                <>
                  <UnifiedFilterBar
                    selectedSort={filters.selectedFilter}
                    onSortChange={filters.setSelectedFilter}
                    channels={filters.channels}
                    selectedChannelId={filters.selectedChannelId}
                    onChannelChange={filters.setSelectedChannelId}
                    channelsLoading={filters.channelsLoading}
                    selectedDuration={filters.selectedDuration}
                    onDurationChange={filters.setSelectedDuration}
                    pureOnly={filters.pureOnly}
                    onPureOnlyChange={filters.setPureOnly}
                    externalOpen={filters.showFilterModal}
                    onExternalClose={() => filters.setShowFilterModal(false)}
                    hideChips={!filters.hasActiveHomeFilters}
                  />
                  {filters.hasActiveHomeFilters && (
                    <View style={{ height: 12 }} />
                  )}
                </>
              ) : null}
            </>
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={() => {
            if (
              !filters.isShowingSearchResults &&
              filters.hasMore &&
              !filters.loading
            ) {
              filters.loadMore();
            }
          }}
          onEndReachedThreshold={1.5}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              colors={[colors.accent.secondary]}
              tintColor={colors.accent.secondary}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
        />
      </View>

      {showSuggestionsOverlay && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: 100,
            backgroundColor: colors.background.primary,
            zIndex: 40,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(0, 0, 0, 0.42)",
              colors.background.primary,
              colors.background.primary,
            ]}
            locations={[0, 0.16, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SearchSuggestions
            suggestions={suggestions}
            onSuggestionPress={(s) => {
              setSearchInput(s.text);
              submitSearch(s.text);
            }}
            onSuggestionInsert={(s) => setSearchInput(s.text)}
          />
        </View>
      )}
    </View>
  );
}
