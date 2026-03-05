import DownloadedAudioCard from "@/components/DownloadedAudioCard";
import DownloadedAudioModal from "@/components/DownloadedAudioModal";
import EmptyState from "@/components/EmptyState";
import { SkeletonDownloadCard } from "@/components/SkeletonLoader";
import { colors } from "@/constants/theme";
import { AudioMetadata, useAudioPlayer } from "@/contexts/AudioContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { useDownloads } from "@/hooks/useDownloads";
import { DownloadMetadata } from "@/services/audioDownload";
import { sortDownloads } from "@/utils/formatters";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    AccessibilityInfo,
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SortBy = "date" | "title";
type SortOrder = "asc" | "desc";

export default function DownloadsScreen() {
  // Downloads hook
  const {
    downloads,
    loading,
    error,
    totalSize,
    refresh,
    deleteAudio,
    clearAll,
  } = useDownloads();

  // Audio player context
  const { loadAndPlay, setAutoplayCallback } = useAudioPlayer();

  // Tab bar visibility context
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();

  // Modal state
  const [selectedAudio, setSelectedAudio] = useState<DownloadMetadata | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);

  // Sort state
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const flatListRef = useRef<FlatList>(null);

  // Delete loading state
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Filter and sort downloads
  const displayData = useMemo(() => {
    return sortDownloads(downloads, sortBy, sortOrder);
  }, [downloads, sortBy, sortOrder]);

  // Set up autoplay callback for downloads
  useEffect(() => {
    const handleAutoplay = async () => {
      if (downloads.length === 0) {
        console.log("[Autoplay] No downloads available for autoplay");
        return;
      }

      // Pick a random download
      const randomIndex = Math.floor(Math.random() * downloads.length);
      const randomDownload = downloads[randomIndex];

      console.log("[Autoplay] Playing random download:", randomDownload.title);

      // Generate thumbnail URL from YouTube ID
      const thumbnailUrl = `https://img.youtube.com/vi/${randomDownload.youtubeId}/maxresdefault.jpg`;

      const audioMetadata: AudioMetadata = {
        audioUrl: randomDownload.localUri,
        title: randomDownload.title,
        channelName: "Downloaded Audio",
        thumbnailUrl,
        isLocalFile: true,
        audioId: randomDownload.audioId,
        youtubeId: randomDownload.youtubeId,
      };

      await loadAndPlay(audioMetadata);
    };

    // Register the callback
    setAutoplayCallback(handleAutoplay);

    // Cleanup
    return () => {
      setAutoplayCallback(null);
    };
  }, [downloads, loadAndPlay, setAutoplayCallback]);

  // Handle audio selection
  const handleAudioPress = useCallback((audio: DownloadMetadata) => {
    setSelectedAudio(audio);
    setModalVisible(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setSelectedAudio(null), 300);
  }, []);

  // Handle delete with confirmation
  const handleDelete = useCallback(
    async (audioId: string, title: string) => {
      Alert.alert(
        "Delete Download",
        `Are you sure you want to delete "${title}"?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // Add to deleting set
              setDeletingIds((prev) => new Set(prev).add(audioId));

              try {
                await deleteAudio(audioId);
                // Success haptic and toast
                await Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                showSuccessToast("Audio deleted successfully");
                // Announce to screen reader
                AccessibilityInfo.announceForAccessibility(
                  "Audio deleted successfully",
                );
              } catch (err) {
                // Error haptic and toast
                await Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error,
                );
                const errorMessage =
                  err instanceof Error
                    ? err.message
                    : "Unable to delete the audio file";
                showErrorToast(errorMessage);
              } finally {
                // Remove from deleting set
                setDeletingIds((prev) => {
                  const next = new Set(prev);
                  next.delete(audioId);
                  return next;
                });
              }
            },
          },
        ],
      );
    },
    [deleteAudio],
  );

  // Handle clear all with confirmation
  const handleClearAll = useCallback(() => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      "Clear All Downloads",
      "Are you sure you want to delete all downloaded audio files? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            // Heavy haptic for destructive action
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            );

            try {
              await clearAll();
              // Success haptic and toast
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              showSuccessToast("All downloads cleared successfully");
              // Announce to screen reader
              AccessibilityInfo.announceForAccessibility(
                "All downloads cleared successfully",
              );
            } catch (err) {
              // Error haptic and toast
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error,
              );
              const errorMessage =
                err instanceof Error
                  ? err.message
                  : "Unable to clear all downloads";
              showErrorToast(errorMessage);
            }
          },
        },
      ],
    );
  }, [clearAll]);

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: SortBy) => {
    setSortBy((prevSortBy) => {
      if (prevSortBy === newSortBy) {
        // Toggle order if same sort option
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
      } else {
        // Default to desc for new sort option
        setSortOrder("desc");
      }
      return newSortBy;
    });
  }, []);

  // Handle scroll to show/hide tab bar
  const handleScroll = useCallback(
    (event: any) => {
      // Handle tab bar visibility
      handleTabBarScroll(event);
    },
    [handleTabBarScroll],
  );

  // Optimize FlatList performance with getItemLayout
  const ITEM_HEIGHT = 110; // Card height (94 + 16 padding)
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  // Render individual download card
  const renderDownloadCard = useCallback(
    ({ item }: { item: DownloadMetadata }) => {
      const isDeleting = deletingIds.has(item.audioId);

      return (
        <View className="px-4">
          <View className="relative">
            <DownloadedAudioCard
              audio={item}
              onPress={() => !isDeleting && handleAudioPress(item)}
              onDelete={() =>
                !isDeleting && handleDelete(item.audioId, item.title)
              }
            />
            {isDeleting && (
              <View className="absolute inset-0 items-center justify-center bg-black/50 rounded-2xl">
                <ActivityIndicator
                  size="large"
                  color={colors.accent.secondary}
                />
                <Text className="mt-2 text-sm text-white">Deleting...</Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    [handleAudioPress, handleDelete, deletingIds],
  );

  // Render empty state
  const renderEmptyState = () => {
    if (loading && downloads.length === 0) {
      return (
        <View className="px-4 py-4">
          <SkeletonDownloadCard />
          <SkeletonDownloadCard />
          <SkeletonDownloadCard />
        </View>
      );
    }

    if (error && downloads.length === 0) {
      return (
        <EmptyState
          message={
            error.message || "Unable to load downloads. Please try again."
          }
          iconName="alert-circle"
          actionLabel="Retry"
          onAction={refresh}
        />
      );
    }

    if (downloads.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <View className="items-center mb-6">
            <Ionicons name="download-outline" size={120} color="#525252" />
          </View>
          <Text className="text-center text-sm text-neutral-400">
            Videos you download will appear here
          </Text>
        </View>
      );
    }

    return null;
  };

  // Render sort filter bar
  const renderSortBar = () => {
    if (downloads.length === 0) return null;

    const sortOptions: {
      value: SortBy;
      label: string;
      iconName: keyof typeof Ionicons.glyphMap;
    }[] = [
      { value: "date", label: "Date", iconName: "calendar" },
      { value: "title", label: "Title", iconName: "text" },
    ];

    return (
      <View className="bg-neutral-800 border-b border-neutral-700">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          {sortOptions.map((option) => {
            const isSelected = sortBy === option.value;
            const sortOrderLabel =
              sortOrder === "asc" ? "ascending" : "descending";
            return (
              <Pressable
                key={option.value}
                onPress={() => handleSortChange(option.value)}
                className={`mr-3 px-4 py-2 rounded-full flex-row items-center ${
                  isSelected ? "bg-blue-500" : "bg-neutral-700"
                }`}
                style={{ minHeight: 44 }}
                accessibilityRole="button"
                accessibilityLabel={`Sort by ${option.label}${isSelected ? `, ${sortOrderLabel}` : ""}`}
                accessibilityHint={`Double tap to sort downloads by ${option.label}`}
                accessibilityState={{ selected: isSelected }}
              >
                <Ionicons
                  name={option.iconName}
                  size={16}
                  color={isSelected ? "white" : "#d4d4d8"}
                />
                <Text
                  className={`font-semibold text-sm ml-1.5 ${
                    isSelected ? "text-white" : "text-neutral-300"
                  }`}
                  accessible={false}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <Ionicons
                    name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                    size={14}
                    color="white"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Render list header with all fixed components
  const renderListHeader = () => {
    return (
      <View>
        {/* Header Title */}
        <View className="px-4 pt-20">
          <Text className="text-lg font-semibold text-white">
            Your downloads
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background.primary }}
      edges={["top"]}
    >
      <View
        className="flex-1"
        accessible={false}
        accessibilityLabel="Downloads screen"
      >
        {/* Downloads List with Header */}
        <FlatList
          ref={flatListRef}
          data={displayData}
          renderItem={renderDownloadCard}
          keyExtractor={(item) => item.audioId}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 0,
            paddingBottom: 50,
          }}
          ListEmptyComponent={renderEmptyState}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={loading && downloads.length > 0}
              onRefresh={refresh}
              colors={[colors.accent.secondary]}
              tintColor={colors.accent.secondary}
              accessibilityLabel="Pull to refresh downloads"
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          accessibilityLabel={`${displayData.length} downloaded audio ${displayData.length === 1 ? "file" : "files"}`}
          stickyHeaderIndices={[]}
        />
      </View>

      {/* Audio Playback Modal */}
      {selectedAudio && (
        <DownloadedAudioModal
          visible={modalVisible}
          onClose={handleCloseModal}
          audio={selectedAudio}
        />
      )}
    </SafeAreaView>
  );
}
