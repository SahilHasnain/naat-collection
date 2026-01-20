import { BackToTopButton } from "@/components";
import ChannelFilterBar from "@/components/ChannelFilterBar";
import EmptyState from "@/components/EmptyState";
import NaatCard from "@/components/NaatCard";
import SearchBar from "@/components/SearchBar";
import SortFilterBar from "@/components/SortFilterBar";
import { colors } from "@/constants/theme";
import { AudioMetadata, useAudioPlayer } from "@/contexts/AudioContext";
import { useChannels } from "@/hooks/useChannels";
import { useNaats } from "@/hooks/useNaats";
import { useSearch } from "@/hooks/useSearch";
import { appwriteService } from "@/services/appwrite";
import { audioDownloadService } from "@/services/audioDownload";
import { storageService } from "@/services/storage";
import type { Naat, SortOption } from "@/types";
import { showErrorToast } from "@/utils/toast";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

  // Back to top state
  const [showBackToTop, setShowBackToTop] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Audio player context
  const { loadAndPlay, setAutoplayCallback, currentAudio } = useAudioPlayer();

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
    query,
    results: searchResults,
    loading: searchLoading,
    setQuery,
  } = useSearch(selectedChannelId);

  // Load initial data on mount and when filter changes
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, selectedChannelId]);

  // Determine which data to display
  const isSearching = query.trim().length > 0;
  const displayData: Naat[] = isSearching ? searchResults : naats;
  const isLoading = isSearching ? searchLoading : loading;

  // Set up autoplay callback for audio
  useEffect(() => {
    const handleAutoplay = async () => {
      // Get all available naats (not just displayed ones)
      const availableNaats = displayData.filter((naat) => naat.audioId);

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
  }, [displayData, setAutoplayCallback]);

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

        // If user prefers audio mode, load audio directly
        if (savedMode === "audio") {
          await loadAudioDirectly(naat);
        } else {
          // Default to video mode - navigate to video screen
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
        }
      } catch (error) {
        console.error("Error checking playback preference:", error);
        // Fallback to video mode on error
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
      }
    },
    [loadAudioDirectly, router],
  );

  // Load audio directly without opening video modal
  const loadAudioDirectly = React.useCallback(
    async (naat: Naat) => {
      // Track watch history
      await storageService.addToWatchHistory(naat.$id);

      // Fallback to video if no audio ID
      if (!naat.audioId) {
        console.log("No audio ID available, falling back to video mode");
        showErrorToast("Audio not available. Playing video instead.");
        router.push({
          pathname: "/video",
          params: {
            videoUrl: naat.videoUrl,
            title: naat.title,
            channelName: naat.channelName,
            thumbnailUrl: naat.thumbnailUrl,
            youtubeId: naat.youtubeId,
            audioId: naat.audioId,
            isFallback: "true",
          },
        });
        return;
      }

      try {
        // Check if audio is downloaded first
        let audioUrl: string;
        let isLocalFile = false;

        const downloaded = await audioDownloadService.isDownloaded(
          naat.audioId,
        );

        if (downloaded) {
          // Use local file
          audioUrl = audioDownloadService.getLocalPath(naat.audioId);
          isLocalFile = true;
        } else {
          // Fetch from storage
          const response = await appwriteService.getAudioUrl(naat.audioId);

          if (response.success && response.audioUrl) {
            audioUrl = response.audioUrl;
          } else {
            // Fallback to video mode if audio not available
            console.log("Audio not available, falling back to video mode");
            showErrorToast("Audio not available. Playing video instead.");
            router.push({
              pathname: "/video",
              params: {
                videoUrl: naat.videoUrl,
                title: naat.title,
                channelName: naat.channelName,
                thumbnailUrl: naat.thumbnailUrl,
                youtubeId: naat.youtubeId,
                audioId: naat.audioId,
                isFallback: "true",
              },
            });
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
          audioId: naat.audioId,
          youtubeId: naat.youtubeId,
        };

        await loadAndPlay(audioMetadata);
      } catch (err) {
        // Fallback to video mode on error
        console.error("Failed to load audio, falling back to video mode:", err);
        showErrorToast("Failed to load audio. Playing video instead.");
        router.push({
          pathname: "/video",
          params: {
            videoUrl: naat.videoUrl,
            title: naat.title,
            channelName: naat.channelName,
            thumbnailUrl: naat.thumbnailUrl,
            youtubeId: naat.youtubeId,
            audioId: naat.audioId,
            isFallback: "true",
          },
        });
      }
    },
    [loadAndPlay, router],
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

  // Handle infinite scroll
  const handleEndReached = () => {
    if (!isSearching && hasMore && !loading) {
      loadMore();
    }
  };

  // Handle scroll to show/hide back to top button
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowBackToTop(offsetY > 500);
  };

  // Scroll to top
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Render individual naat card - memoized to prevent unnecessary re-renders
  const renderNaatCard = React.useCallback(
    ({ item }: { item: Naat }) => (
      <View className="px-4 mb-4">
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
      </View>
    ),
    [handleNaatPress],
  );

  // Render footer loading indicator
  const renderFooter = () => {
    if (!loading || isSearching || displayData.length === 0) {
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
            Loading naats...
          </Text>
        </View>
      );
    }

    if (error && displayData.length === 0) {
      return (
        <EmptyState
          message="Unable to connect. Please check your internet connection."
          icon="⚠️"
          actionLabel="Retry"
          onAction={handleRefresh}
        />
      );
    }

    if (isSearching && displayData.length === 0) {
      return (
        <EmptyState message="No naats found matching your search." icon="🔍" />
      );
    }

    if (displayData.length === 0) {
      return (
        <EmptyState
          message="No naats available yet. Check back soon!"
          icon="🎵"
        />
      );
    }

    return null;
  };

  return (
    <View className="flex-1 bg-neutral-900">
      <View className="flex-1">
        {/* Scrollable Content */}
        <FlatList
          ref={flatListRef}
          data={displayData}
          renderItem={renderNaatCard}
          keyExtractor={(item) => item.$id}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 50,
          }}
          ListHeaderComponent={
            <>
              {/* Search Bar */}
              <View className="px-4 pt-safe-top pb-3 bg-neutral-800 border-b border-neutral-700">
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search naats..."
                />
              </View>

              {!isSearching ? (
                <>
                  <ChannelFilterBar
                    channels={channels}
                    selectedChannelId={selectedChannelId}
                    onChannelChange={handleChannelChange}
                    loading={channelsLoading}
                  />
                  <SortFilterBar
                    selectedFilter={selectedFilter}
                    onFilterChange={handleFilterChange}
                  />
                </>
              ) : null}
            </>
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={1.5}
          onScroll={handleScroll}
          scrollEventThrottle={400}
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

        {/* Back to Top Button */}
        <BackToTopButton
          visible={showBackToTop}
          onPress={scrollToTop}
          miniPlayerVisible={!!currentAudio}
        />
      </View>
    </View>
  );
}
