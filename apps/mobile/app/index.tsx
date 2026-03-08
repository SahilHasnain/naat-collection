import EmptyState from "@/components/EmptyState";
import { FilterModal } from "@/components/FilterModal";
import NaatCard from "@/components/NaatCard";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import UnifiedFilterBar from "@/components/UnifiedFilterBar";
import { colors } from "@/constants/theme";
import { AudioMetadata, useAudioPlayer } from "@/contexts/AudioContext";
import { useFilterModal } from "@/contexts/FilterModalContext";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext.animated";
import { useSearch as useSearchContext } from "@/contexts/SearchContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { useChannels } from "@/hooks/useChannels";
import { useNaats } from "@/hooks/useNaats";
import { useSearch } from "@/hooks/useSearch";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { appwriteService } from "@/services/appwrite";
import { audioDownloadService } from "@/services/audioDownload";
import { storageService } from "@/services/storage";
import type { DurationOption, Naat, SortOption } from "@/types";
import { showErrorToast } from "@/utils/toast";
import {
  filterNaatsByDuration,
  getPreferredAudioId,
  hasAudio,
} from "@naat-collection/shared";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<SortOption>("forYou");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [selectedDuration, setSelectedDuration] =
    useState<DurationOption>("all");
  const { showFilterModal, setShowFilterModal } = useFilterModal();
  const {
    isSearchActive,
    deactivateSearch,
    searchInput,
    setSearchInput,
    activeSearchQuery,
    setActiveSearchQuery,
    submitSearch,
  } = useSearchContext();

  // Search-specific filters (independent from home filters)
  const [searchChannelId, setSearchChannelId] = useState<string | null>(null);
  const [searchDuration, setSearchDuration] = useState<DurationOption>("all");

  const flatListRef = useRef<FlatList>(null);

  // Audio player context
  const { loadAndPlay, setAutoplayCallback } = useAudioPlayer();

  // Tab bar and header visibility
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll, showHeader } =
    useHeaderVisibility();

  // Data fetching hooks
  const {
    channels,
    loading: channelsLoading,
    refresh: refreshChannels,
  } = useChannels();
  const { naats, loading, error, hasMore, loadMore, refresh } = useNaats(
    selectedChannelId,
    selectedFilter,
  );
  const {
    results: searchResults,
    loading: searchLoading,
    setQuery,
  } = useSearch(searchChannelId);

  // Search suggestions
  const { suggestions, updateSuggestions, addToHistory } = useSearchSuggestions(
    {
      naats,
      maxSuggestions: 10,
    },
  );

  // Derived search state
  const isShowingSearchResults = isSearchActive && activeSearchQuery.length > 0;
  const showSuggestionsOverlay = isSearchActive && !activeSearchQuery;

  // Update suggestions as user types
  useEffect(() => {
    if (isSearchActive) {
      updateSuggestions(searchInput);
    }
  }, [searchInput, isSearchActive, updateSuggestions]);

  // When input changes after submission, go back to suggestions mode
  useEffect(() => {
    if (activeSearchQuery && searchInput !== activeSearchQuery) {
      setActiveSearchQuery("");
    }
  }, [searchInput, activeSearchQuery, setActiveSearchQuery]);

  // Perform actual search when activeSearchQuery changes
  useEffect(() => {
    if (activeSearchQuery) {
      setQuery(activeSearchQuery);
      addToHistory(activeSearchQuery);
    } else {
      setQuery("");
    }
  }, [activeSearchQuery, setQuery, addToHistory]);

  // Reset search-specific state when search deactivates
  useEffect(() => {
    if (!isSearchActive) {
      setSearchChannelId(null);
      setSearchDuration("all");
      setQuery("");
    }
  }, [isSearchActive, setQuery]);

  // Keep header visible during search
  useEffect(() => {
    if (isSearchActive) {
      showHeader();
    }
  }, [isSearchActive, showHeader]);

  // Scroll to top when switching between feed and search results
  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [isShowingSearchResults]);

  // Force header to show when this screen is focused
  useFocusEffect(
    useCallback(() => {
      // Show header and reset scroll tracking state
      showHeader();
    }, [showHeader]),
  );

  // Load initial data on mount and when filter changes
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, selectedChannelId]);

  // Determine which data to display
  const displayData: Naat[] = isShowingSearchResults
    ? filterNaatsByDuration(searchResults, searchDuration)
    : filterNaatsByDuration(naats, selectedDuration);
  const isLoading = isShowingSearchResults ? searchLoading : loading;

  // Handle Android back button when search is active
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isSearchActive) {
          deactivateSearch();
          return true;
        }
        return false;
      },
    );

    return () => backHandler.remove();
  }, [isSearchActive, deactivateSearch]);

  // Load audio directly without opening video modal
  const loadAudioDirectly = React.useCallback(
    async (naat: Naat) => {
      // Track watch history
      await storageService.addToWatchHistory(naat.$id);

      // Get preferred audio ID (cutAudio if available, otherwise audioId)
      const audioId = getPreferredAudioId(naat);

      // Fallback to video if no audio ID
      if (!audioId) {
        console.log("No audio ID available, asking user for fallback");

        Alert.alert(
          "Audio Not Available",
          "Audio is not available for this content. Would you like to play the video instead?",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Play Video",
              onPress: () => {
                // Navigate to video mode without changing preference
                router.push({
                  pathname: "/video",
                  params: {
                    videoUrl: naat.videoUrl,
                    title: naat.title,
                    channelName: naat.channelName,
                    thumbnailUrl: naat.thumbnailUrl,
                    youtubeId: naat.youtubeId,
                    audioId: audioId,
                    isFallback: "true", // Mark as fallback so preference isn't changed
                  },
                });
              },
            },
          ],
        );
        return;
      }

      try {
        // Check if audio is downloaded first
        let audioUrl: string;
        let isLocalFile = false;

        const downloaded = await audioDownloadService.isDownloaded(audioId);

        if (downloaded) {
          // Use local file
          audioUrl = audioDownloadService.getLocalPath(audioId);
          isLocalFile = true;
        } else {
          // Fetch from storage
          const response = await appwriteService.getAudioUrl(audioId);

          if (response.success && response.audioUrl) {
            audioUrl = response.audioUrl;
          } else {
            // Audio not available - ask user before falling back to video
            console.log("Audio not available, asking user for fallback");

            Alert.alert(
              "Audio Not Available",
              "Audio is not available for this content. Would you like to play the video instead?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {
                    showErrorToast("Playback cancelled");
                  },
                },
                {
                  text: "Play Video",
                  onPress: () => {
                    // Navigate to video mode without changing preference
                    router.push({
                      pathname: "/video",
                      params: {
                        videoUrl: naat.videoUrl,
                        title: naat.title,
                        channelName: naat.channelName,
                        thumbnailUrl: naat.thumbnailUrl,
                        youtubeId: naat.youtubeId,
                        audioId: audioId,
                        isFallback: "true", // Mark as fallback so preference isn't changed
                      },
                    });
                  },
                },
              ],
            );
            return;
          }
        }

        // Load audio via AudioContext
        const audioMetadata: AudioMetadata = {
          audioUrl,
          title: naat.title,
          channelName: naat.channelName,
          thumbnailUrl: naat.thumbnailUrl,
          isLocalFile,
          audioId: audioId,
          youtubeId: naat.youtubeId,
        };

        await loadAndPlay(audioMetadata);
      } catch (err) {
        // Error loading audio - ask user before falling back to video
        console.error("Failed to load audio:", err);

        Alert.alert(
          "Audio Loading Failed",
          "Unable to load audio. Would you like to play the video instead?",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                showErrorToast("Playback cancelled");
              },
            },
            {
              text: "Play Video",
              onPress: () => {
                // Navigate to video mode without changing preference
                router.push({
                  pathname: "/video",
                  params: {
                    videoUrl: naat.videoUrl,
                    title: naat.title,
                    channelName: naat.channelName,
                    thumbnailUrl: naat.thumbnailUrl,
                    youtubeId: naat.youtubeId,
                    audioId: audioId,
                    isFallback: "true", // Mark as fallback so preference isn't changed
                  },
                });
              },
            },
          ],
        );
      }
    },
    [loadAndPlay, router],
  );

  // Set up autoplay callback for audio
  useEffect(() => {
    const handleAutoplay = async () => {
      // Get all available naats (not just displayed ones)
      const availableNaats = displayData.filter((naat) => hasAudio(naat));

      if (availableNaats.length === 0) {
        console.log("[Autoplay] No naats available for autoplay");
        return;
      }

      // Pick a random naat
      const randomIndex = Math.floor(Math.random() * availableNaats.length);
      const randomNaat = availableNaats[randomIndex];

      console.log("[Autoplay] Playing random naat:", randomNaat.title);

      // Load the random naat
      await loadAudioDirectly(randomNaat);
    };

    // Register the callback
    setAutoplayCallback(handleAutoplay);

    // Cleanup
    return () => {
      setAutoplayCallback(null);
    };
  }, [displayData, loadAudioDirectly, setAutoplayCallback]);

  // Store naats in a ref to avoid recreating callbacks
  const naatsMapRef = React.useRef<Map<string, Naat>>(new Map());

  // Update the map when displayData changes
  React.useEffect(() => {
    naatsMapRef.current.clear();
    displayData.forEach((naat) => {
      naatsMapRef.current.set(naat.$id, naat);
    });
  }, [displayData]);

  // Handle naat selection - check preference and open accordingly
  const handleNaatPress = React.useCallback(
    async (naatId: string) => {
      const naat = naatsMapRef.current.get(naatId);
      if (!naat) return;

      // Track watch history
      await storageService.addToWatchHistory(naat.$id);

      try {
        // Check saved playback mode preference
        const savedMode = await storageService.loadPlaybackMode();

        // If user prefers video mode, navigate to video screen
        if (savedMode === "video") {
          router.push({
            pathname: "/video",
            params: {
              videoUrl: naat.videoUrl,
              title: naat.title,
              channelName: naat.channelName,
              thumbnailUrl: naat.thumbnailUrl,
              youtubeId: naat.youtubeId,
              audioId: naat.audioId,
              isFallback: "false",
            },
          });
        } else {
          // Default to audio mode - load audio directly
          await loadAudioDirectly(naat);
        }
      } catch (error) {
        console.error("Error checking playback preference:", error);
        // Fallback to audio mode on error
        await loadAudioDirectly(naat);
      }
    },
    [loadAudioDirectly, router],
  );

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    await Promise.all([refresh(), refreshChannels()]);
  };

  // Handle filter change
  const handleFilterChange = (filter: SortOption) => {
    setSelectedFilter(filter);
  };

  // Handle channel filter change
  const handleChannelChange = (channelId: string | null) => {
    setSelectedChannelId(channelId);
  };

  // Handle duration filter change
  const handleDurationChange = (duration: DurationOption) => {
    setSelectedDuration(duration);
  };

  // Handle infinite scroll
  const handleEndReached = () => {
    if (!isShowingSearchResults && hasMore && !loading) {
      loadMore();
    }
  };

  // Handle scroll to show/hide tab bar and header
  const handleScroll = (event: any) => {
    handleTabBarScroll(event);
    if (!isSearchActive) {
      handleHeaderScroll(event);
    }
  };

  // Render individual naat card - memoized to prevent unnecessary re-renders
  const renderNaatCard = React.useCallback(
    ({ item }: { item: Naat }) => (
      <NaatCard
        id={item.$id}
        title={item.title}
        thumbnail={item.thumbnailUrl}
        duration={item.duration}
        uploadDate={item.uploadDate}
        channelName={item.channelName}
        views={item.views}
        onPress={() => handleNaatPress(item.$id)}
      />
    ),
    [handleNaatPress],
  );

  // Render footer loading indicator
  const renderFooter = () => {
    if (!loading || isShowingSearchResults || displayData.length === 0) {
      return null;
    }

    return (
      <View className="py-6">
        <ActivityIndicator size="small" color={colors.accent.secondary} />
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading && displayData.length === 0) {
      return (
        <View className="items-center justify-center flex-1 py-20">
          <ActivityIndicator size="large" color={colors.accent.secondary} />
          <Text className="mt-4 text-base text-neutral-400">
            {isShowingSearchResults ? "Searching..." : "Loading naats..."}
          </Text>
        </View>
      );
    }

    if (error && displayData.length === 0) {
      return (
        <EmptyState
          message="Unable to connect. Please check your internet connection."
          iconName="alert-circle"
          actionLabel="Retry"
          onAction={handleRefresh}
        />
      );
    }

    if (isShowingSearchResults && displayData.length === 0) {
      return (
        <EmptyState
          message="No naats found matching your search."
          iconName="search"
        />
      );
    }

    if (displayData.length === 0) {
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
      <View className="flex-1">
        {/* Scrollable Content */}
        <FlatList
          ref={flatListRef}
          data={displayData}
          renderItem={renderNaatCard}
          keyExtractor={(item) => item.$id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 100, // Space for fixed header
            paddingBottom: 50,
          }}
          ListHeaderComponent={
            <>
              {isShowingSearchResults ? (
                <>
                  <SearchFilterBar
                    channels={channels}
                    selectedChannelId={searchChannelId}
                    onChannelChange={setSearchChannelId}
                    selectedDuration={searchDuration}
                    onDurationChange={setSearchDuration}
                  />
                  <View style={{ height: 12 }} />
                </>
              ) : !isSearchActive &&
                (selectedFilter !== "forYou" ||
                  selectedChannelId !== null ||
                  selectedDuration !== "all") ? (
                <>
                  <UnifiedFilterBar
                    selectedSort={selectedFilter}
                    onSortChange={handleFilterChange}
                    channels={channels}
                    selectedChannelId={selectedChannelId}
                    onChannelChange={handleChannelChange}
                    channelsLoading={channelsLoading}
                    selectedDuration={selectedDuration}
                    onDurationChange={handleDurationChange}
                  />
                  <View style={{ height: 12 }} />
                </>
              ) : null}
            </>
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
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

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedSort={selectedFilter}
        onSortChange={setSelectedFilter}
        channels={channels}
        selectedChannelId={selectedChannelId}
        onChannelChange={setSelectedChannelId}
        channelsLoading={channelsLoading}
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
      />

      {/* Suggestions Overlay */}
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
          <SearchSuggestions
            suggestions={suggestions}
            onSuggestionPress={(suggestion) => {
              setSearchInput(suggestion.text);
              submitSearch(suggestion.text);
            }}
            onSuggestionInsert={(suggestion) => {
              setSearchInput(suggestion.text);
            }}
          />
        </View>
      )}
    </View>
  );
}
