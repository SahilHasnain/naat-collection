import { BackToTopButton } from "@/components";
import EmptyState from "@/components/EmptyState";
import HistoryCard from "@/components/HistoryCard";
import { colors } from "@/constants/theme";
import { AudioMetadata, useAudioPlayer } from "@/contexts/AudioContext";
import { usePlaybackMode } from "@/contexts/PlaybackModeContext";
import { HistoryItem, useHistory } from "@/hooks/useHistory";
import { appwriteService } from "@/services/appwrite";
import { audioDownloadService } from "@/services/audioDownload";
import { storageService } from "@/services/storage";
import type { Naat } from "@/types";
import { DateGroup, groupByDate } from "@/utils/dateGrouping";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import { getPreferredAudioId } from "@naat-collection/shared";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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
  const opacity = useSharedValue(1);

  const handleDelete = useCallback(() => {
    // Animate out and delete
    translateX.value = withTiming(-500, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    itemHeight.value = withTiming(0, { duration: 300 }, (finished) => {
      "worklet";
      if (finished) {
        runOnJS(onDelete)();
      }
    });
  }, [onDelete, translateX, opacity, itemHeight]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow left swipe (negative translation)
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -60);
      }
    })
    .onEnd((event) => {
      const shouldRevealDelete = event.translationX < -30;

      if (shouldRevealDelete) {
        // Snap to reveal delete icon
        translateX.value = withSpring(-60);
      } else {
        // Snap back
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    height: itemHeight.value === 0 ? 0 : undefined,
    opacity: opacity.value,
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  return (
    <View className="relative mb-3">
      {/* Delete icon */}
      <Animated.View
        style={deleteButtonStyle}
        className="absolute right-6 top-0 bottom-0 justify-center"
      >
        <Pressable
          onPress={handleDelete}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
        </Pressable>
      </Animated.View>

      {/* Swipeable card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <HistoryCard
            title={item.title}
            thumbnail={item.thumbnailUrl}
            duration={item.duration}
            channelName={item.channelName}
            views={item.views}
            watchedAt={item.watchedAt}
            onPress={onPress}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();

  // Back to top state
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sectionListRef = useRef<SectionList<HistoryItem, HistorySection>>(null);

  // Audio player context
  const { loadAndPlay, currentAudio } = useAudioPlayer();

  // Playback mode context
  const { isNormalAudioActive, isLiveRadioActive } = usePlaybackMode();

  // Data fetching hook
  const {
    history,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    clearHistory,
    removeFromHistory,
  } = useHistory();

  // Group history by date
  const groupedHistory = useMemo(() => {
    const groups = groupByDate(history);
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
  }, [history]);

  // Load audio directly without opening video modal
  const loadAudioDirectly = useCallback(
    async (naat: Naat) => {
      // Track watch history
      await storageService.addToWatchHistory(naat.$id);

      // Get preferred audio ID (cutAudio if available, otherwise audioId)
      const audioId = getPreferredAudioId(naat);

      // Fallback to video if no audio ID
      if (!audioId) {
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
            audioId: audioId,
            isFallback: "true",
          },
        });
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
                audioId: audioId,
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
          audioId: audioId,
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

  // Handle naat selection
  const handleNaatPress = useCallback(
    async (naatId: string) => {
      const naat = history.find((n) => n.$id === naatId);
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
    [history, loadAudioDirectly, router],
  );

  // Handle delete single item
  const handleDeleteItem = useCallback(
    async (naatId: string, title: string) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        await removeFromHistory(naatId);
        showSuccessToast("Removed from history");
        AccessibilityInfo.announceForAccessibility(
          `${title} removed from history`,
        );
      } catch (err) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const errorMessage =
          err instanceof Error ? err.message : "Unable to remove from history";
        showErrorToast(errorMessage);
      }
    },
    [removeFromHistory],
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
              Haptics.NotificationFeedbackType.Warning,
            );

            try {
              await clearHistory();
              // Success haptic and toast
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              showSuccessToast("Watch history cleared successfully");
              // Announce to screen reader
              AccessibilityInfo.announceForAccessibility(
                "Watch history cleared successfully",
              );
            } catch (err) {
              // Error haptic and toast
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error,
              );
              const errorMessage =
                err instanceof Error
                  ? err.message
                  : "Unable to clear watch history";
              showErrorToast(errorMessage);
            }
          },
        },
      ],
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
      <View className="px-4 py-2 bg-neutral-900">
        <Text className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {section.title}
        </Text>
      </View>
    ),
    [],
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
    [handleNaatPress, handleDeleteItem],
  );

  // Handle infinite scroll
  const handleEndReached = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  // Render footer loading indicator
  const renderFooter = useCallback(() => {
    if (!loading || history.length === 0) {
      return null;
    }

    return (
      <View className="py-6">
        <ActivityIndicator size="small" color={colors.accent.secondary} />
      </View>
    );
  }, [loading, history.length]);

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
          iconName="alert-circle"
          actionLabel="Retry"
          onAction={refresh}
        />
      );
    }

    if (history.length === 0) {
      return (
        <EmptyState
          message="No watch history yet. Start watching some naats!"
          iconName="time"
        />
      );
    }

    return null;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-neutral-900" edges={["top"]}>
        <View className="flex-1">
          {/* History List */}
          {groupedHistory.length > 0 ? (
            <SectionList<HistoryItem, HistorySection>
              ref={sectionListRef}
              sections={groupedHistory}
              renderItem={renderHistoryCard}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item) => item.$id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                paddingTop: 12,
                paddingBottom: 100,
              }}
              onScroll={handleScroll}
              scrollEventThrottle={400}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
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

          {/* Floating Clear All Button */}
          {/* Temporarily commented out
          {history.length > 0 && (
            <View className="absolute bottom-6 right-6">
              <Pressable
                onPress={handleClearHistory}
                className="bg-red-500 rounded-full p-4 shadow-lg"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  elevation: 8,
                  shadowColor: "#ef4444",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                })}
                accessibilityRole="button"
                accessibilityLabel="Clear all history"
                accessibilityHint="Double tap to clear all watch history"
              >
                <Ionicons name="trash-outline" size={24} color="white" />
              </Pressable>
            </View>
          )}
          */}

          {/* Back to Top Button */}
          <BackToTopButton
            visible={showBackToTop}
            onPress={scrollToTop}
            miniPlayerVisible={isNormalAudioActive || isLiveRadioActive}
          />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
