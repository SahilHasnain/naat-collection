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
import { getPreferredDuration } from "@naat-collection/shared";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  const flatListRef = useRef<FlatList>(null);

  // Contexts
  const {
    isSearchActive, deactivateSearch,
    searchInput, setSearchInput,
    activeSearchQuery, setActiveSearchQuery,
    submitSearch,
  } = useSearchContext();
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll, showHeader } = useHeaderVisibility();

  // Custom hooks
  const filters = useHomeFilters();
  const { setQuery, resetSearchFilters, loadMore, isShowingSearchResults } = filters;
  const { downloadStates, handleDownload } = useDownloadManager(filters.displayData);
  const { handleNaatPress } = useNaatPlayback(filters.displayData);

  // Search suggestions
  const { suggestions, updateSuggestions, addToHistory } = useSearchSuggestions({
    naats: filters.naats,
    maxSuggestions: 10,
  });

  const showSuggestionsOverlay = isSearchActive && !activeSearchQuery;

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

  useFocusEffect(useCallback(() => { showHeader(); }, [showHeader]));

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.selectedFilter, filters.selectedChannelId]);

  // Android back button
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isSearchActive) { deactivateSearch(); return true; }
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

  const activePureOnly = isShowingSearchResults ? filters.searchPureOnly : filters.pureOnly;

  const renderNaatCard = React.useCallback(
    ({ item }: { item: Naat }) => {
      if (activePureOnly && !item.cutAudio) return null;
      const ds = downloadStates[item.$id];
      return (
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
      );
    },
    [handleNaatPress, handleDownload, downloadStates, activePureOnly],
  );

  const renderFooter = () => {
    if (!filters.loading || filters.isShowingSearchResults || filters.displayData.length === 0) return null;
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
            {filters.isShowingSearchResults ? "Searching..." : "Loading naats..."}
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
      return <EmptyState message="No naats found matching your search." iconName="search" />;
    }
    if (filters.displayData.length === 0) {
      return <EmptyState message="No naats available yet. Check back soon!" iconName="musical-notes" />;
    }
    return null;
  };

  // --- JSX ---

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background.primary }}>
      <View className="flex-1">
        <FlatList
          ref={flatListRef}
          data={filters.displayData}
          renderItem={renderNaatCard}
          keyExtractor={(item) => item.$id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 100, paddingBottom: 50 }}
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
                  {filters.hasActiveHomeFilters && <View style={{ height: 12 }} />}
                </>
              ) : null}
            </>
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={() => {
            if (!filters.isShowingSearchResults && filters.hasMore && !filters.loading) {
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
            top: 0, left: 0, right: 0, bottom: 0,
            paddingTop: 100,
            backgroundColor: colors.background.primary,
            zIndex: 40,
          }}
        >
          <SearchSuggestions
            suggestions={suggestions}
            onSuggestionPress={(s) => { setSearchInput(s.text); submitSearch(s.text); }}
            onSuggestionInsert={(s) => setSearchInput(s.text)}
          />
        </View>
      )}
    </View>
  );
}
