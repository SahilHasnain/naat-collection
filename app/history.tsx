import { BackToTopButton, VideoModal } from "@/components";
import EmptyState from "@/components/EmptyState";
import NaatCard from "@/components/NaatCard";
import SearchBar from "@/components/SearchBar";
import { colors } from "@/constants/theme";
import { AudioMetadata, useAudioPlayer } from "@/contexts/AudioContext";
import { HistoryItem, useHistory } from "@/hooks/useHistory";
import { appwriteService } from "@/services/appwrite";
import { audioDownloadService } from "@/services/audioDownload";
import { storageService } from "@/services/storage";
import type { Naat } from "@/types";
import {
  DateGroup,
  formatRelativeTime,
  groupByDate,
} from "@/utils/dateGrouping";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Section type for grouped history
interface HistorySection {
  title: DateGroup;
  data: HistoryItem[];
}

// Swipeable card component
function SwipeableHistoryCard({
  item,
  onPress,
  onDelete,
}: {
  item: HistoryItem;
  onPress: () => void;
  onDelete: () => void;
}) {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow left swipe (negative translation)
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      const shouldDelete = event.translationX < -100;

      if (shouldDelete) {
        translateX.value = withTiming(-500, { duration: 300 });
        itemHeight.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(onDelete)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    height: itemHeight.value === 0 ? 0 : undefined,
    opacity: itemHeight.value,
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  return (
    <View className="relative mb-4">
      {/* Delete button background */}
      <Animated.View
        style={deleteButtonStyle}
        className="absolute right-4 top-0 bottom-0 justify-center"
      >
        <View className="bg-red-500 px-6 rounded-2xl h-full justify-center">
          <Ionicons name="trash-outline" size={24} color="white" />
        </View>
      </Animated.View>

      {/* Swipeable card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <View className="relative">
            <NaatCard
              id={item.$id}
              title={item.title}
              thumbnail={item.thumbnailUrl}
              duration={item.duration}
              uploadDate={item.uploadDate}
              channelName={item.channelName}
              views={item.views}
              onPress={onPress}
            />
            {/* Timestamp overlay */}
            <View className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded-md">
              <Text className="text-xs text-neutral-300">
                {formatRelativeTime(item.watchedAt)}
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function HistoryScreen() {
  // Modal state
  const [selectedNaat, setSelectedNaat] = useState<Naat | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isVideoFallback, setIsVideoFallback] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Back to top state
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sectionListRef = useRef<SectionList<HistoryItem, HistorySection>>(null);

  // Audio player context
  const { loadAndPlay } = useAudioPlayer();

  // Data fetching hook
  const { history, loading, error, refresh, clearHistory, removeFromHistory } =
    useHistory();

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter history based on search query
  const filteredHistory = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return history;
    }

    const query = debouncedQuery.toLowerCase();
    return history.filter(
      (naat) =>
        naat.title.toLowerCase().includes(query) ||
        naat.channelName.toLowerCase().includes(query)
    );
  }, [history, debouncedQuery]);

  // Group history by date
  const groupedHistory = useMemo(() => {
    const groups = groupByDate(filteredHistory);
    const sections: HistorySection[] = [];

    // Convert Map to array in order
    const order: DateGroup[] = [
      "Today",
      "Yesterday",
      "This Week",
      "This Month",
      "Older",
    ];

    order.forEach((group) => {
      const items = groups.get(group);
      if (items && items.length > 0) {
        sections.push({ title: group, data: items });
      }
    });

    return sections;
  }, [filteredHistory]);

  // Load audio directly without opening video modal
  const loadAudioDirectly = useCallback(
    async (naat: Naat) => {
      // Track watch history
      await storageService.addToWatchHistory(naat.$id);

      // Fallback to video if no audio ID
      if (!naat.audioId) {
        console.log("No audio ID available, falling back to video mode");
        showErrorToast("Audio not available. Playing video instead.");
        setIsVideoFallback(true);
        setSelectedNaat(naat);
        setModalVisible(true);
        return;
      }

      try {
        // Check if audio is downloaded first
        let audioUrl: string;
        let isLocalFile = false;

        const downloaded = await audioDownloadService.isDownloaded(
          naat.audioId
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
            setIsVideoFallback(true);
            setSelectedNaat(naat);
            setModalVisible(true);
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
        setIsVideoFallback(true);
        setSelectedNaat(naat);
        setModalVisible(true);
      }
    },
    [loadAndPlay]
  );

  // Handle naat selection
  const handleNaatPress = useCallback(
    async (naatId: string) => {
      const naat = filteredHistory.find((n) => n.$id === naatId);
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
          // Default to video mode
          setIsVideoFallback(false);
          setSelectedNaat(naat);
          setModalVisible(true);
        }
      } catch (error) {
        console.error("Error checking playback preference:", error);
        // Fallback to video mode on error
        setIsVideoFallback(false);
        setSelectedNaat(naat);
        setModalVisible(true);
      }
    },
    [filteredHistory, loadAudioDirectly]
  );

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setIsVideoFallback(false);
    setTimeout(() => setSelectedNaat(null), 300);
  }, []);

  // Handle delete single item
  const handleDeleteItem = useCallback(
    async (naatId: string, title: string) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        await removeFromHistory(naatId);
        showSuccessToast("Removed from history");
        AccessibilityInfo.announceForAccessibility(
          `${title} removed from history`
        );
      } catch (err) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const errorMessage =
          err instanceof Error ? err.message : "Unable to remove from history";
        showErrorToast(errorMessage);
      }
    },
    [removeFromHistory]
  );

  // Handle clear history with confirmation
  const handleClearHistory = useCallback(() => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      "Clear Watch History",
      "Are you sure you want to clear all watch history? This action cannot be undone.",
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
              Haptics.NotificationFeedbackType.Warning
            );

            try {
              await clearHistory();
              // Success haptic and toast
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              showSuccessToast("Watch history cleared successfully");
              // Announce to screen reader
              AccessibilityInfo.announceForAccessibility(
                "Watch history cleared successfully"
              );
            } catch (err) {
              // Error haptic and toast
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
              const errorMessage =
                err instanceof Error
                  ? err.message
                  : "Unable to clear watch history";
              showErrorToast(errorMessage);
            }
          },
        },
      ]
    );
  }, [clearHistory]);

  // Handle scroll to show/hide back to top button
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowBackToTop(offsetY > 500);
  }, []);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    sectionListRef.current?.scrollToLocation({
      sectionIndex: 0,
      itemIndex: 0,
      animated: true,
    });
  }, []);

  // Render section header
  const renderSectionHeader = useCallback(
    ({ section }: { section: HistorySection }) => (
      <View className="px-4 py-3 bg-neutral-800">
        <Text className="text-sm font-semibold text-neutral-400 uppercase">
          {section.title}
        </Text>
      </View>
    ),
    []
  );

  // Render individual naat card
  const renderHistoryCard = useCallback(
    ({ item }: { item: HistoryItem }) => (
      <View className="px-4">
        <SwipeableHistoryCard
          item={item}
          onPress={() => handleNaatPress(item.$id)}
          onDelete={() => handleDeleteItem(item.$id, item.title)}
        />
      </View>
    ),
    [handleNaatPress, handleDeleteItem]
  );

  // Render empty state
  const renderEmptyState = () => {
    if (loading && history.length === 0) {
      return (
        <View className="items-center justify-center flex-1 py-20">
          <ActivityIndicator size="large" color={colors.accent.secondary} />
          <Text className="mt-4 text-base text-neutral-400">
            Loading history...
          </Text>
        </View>
      );
    }

    if (error && history.length === 0) {
      return (
        <EmptyState
          message="Unable to load history. Please try again."
          icon="⚠️"
          actionLabel="Retry"
          onAction={refresh}
        />
      );
    }

    if (debouncedQuery && filteredHistory.length === 0) {
      return (
        <EmptyState message="No naats found matching your search." icon="🔍" />
      );
    }

    if (history.length === 0) {
      return (
        <EmptyState
          message="No watch history yet. Start watching some naats!"
          icon="🕐"
        />
      );
    }

    return null;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-neutral-900" edges={["top"]}>
        <View className="flex-1">
          {/* Header */}
          <View className="px-4 py-4 bg-neutral-800 border-b border-neutral-700">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-2xl font-bold text-white">
                  Watch History
                </Text>
                {history.length > 0 && (
                  <Text className="mt-1 text-sm text-neutral-400">
                    {history.length} {history.length === 1 ? "naat" : "naats"}{" "}
                    watched
                  </Text>
                )}
              </View>
              {history.length > 0 && (
                <Pressable
                  onPress={handleClearHistory}
                  className="px-4 py-2 bg-red-500/20 rounded-full"
                  style={{ minHeight: 44 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all history"
                  accessibilityHint="Double tap to clear all watch history"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text className="ml-2 text-sm font-semibold text-red-500">
                      Clear
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          {/* Search Bar */}
          {history.length > 0 && (
            <View className="px-4 py-3 bg-neutral-800 border-b border-neutral-700">
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search history..."
              />
            </View>
          )}

          {/* History List */}
          {groupedHistory.length > 0 ? (
            <SectionList<HistoryItem, HistorySection>
              ref={sectionListRef}
              sections={groupedHistory}
              renderItem={renderHistoryCard}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item) => item.$id}
              contentContainerStyle={{
                flexGrow: 1,
                paddingTop: 8,
                paddingBottom: 50,
              }}
              onScroll={handleScroll}
              scrollEventThrottle={400}
              refreshControl={
                <RefreshControl
                  refreshing={loading && history.length > 0}
                  onRefresh={refresh}
                  colors={[colors.accent.secondary]}
                  tintColor={colors.accent.secondary}
                />
              }
              stickySectionHeadersEnabled={true}
            />
          ) : (
            <View className="flex-1">{renderEmptyState()}</View>
          )}

          {/* Back to Top Button */}
          <BackToTopButton visible={showBackToTop} onPress={scrollToTop} />
        </View>

        {/* Video Modal */}
        {selectedNaat && (
          <VideoModal
            visible={modalVisible}
            onClose={handleCloseModal}
            videoUrl={selectedNaat.videoUrl}
            title={selectedNaat.title}
            channelName={selectedNaat.channelName}
            thumbnailUrl={selectedNaat.thumbnailUrl}
            youtubeId={selectedNaat.youtubeId}
            audioId={selectedNaat.audioId}
            isFallback={isVideoFallback}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
