import { colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { shareService } from "@/services/shareService";
import { appwriteService } from "@/services/appwrite";
import { showErrorToast, showSuccessToast } from "@/utils";
import type { MenuAnchor, Naat } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MENU_WIDTH = 220;
const MENU_MAX_HEIGHT = 420;
const EDGE_MARGIN = 8;

interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

interface NaatCardMenuProps {
  visible: boolean;
  anchor: MenuAnchor | null;
  selectedNaat: Naat | null;
  savedPlaybackMode: "audio" | "video";
  onClose: () => void;
  onDownload?: () => void;
  onAlternatePlay: () => void;
  onNotForYou?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isDownloaded?: boolean;
  showDownload?: boolean;
  onExcluded?: (naatId: string, excluded: boolean) => void;
  onBestChanged?: (naatId: string, best: boolean) => void;
  /** Insert this naat right after the current track. */
  onPlayNext?: (naat: Naat) => void;
  /** Append this naat to the end of the queue. */
  onAddToQueue?: (naat: Naat) => void;
}

/**
 * A context menu anchored near the card that triggered it (instead of a
 * bottom action sheet). Rendered inside a transparent Modal and positioned
 * relative to the kebab button's on-screen location, clamped to the screen
 * edges and flipped above the anchor when there isn't room below.
 */
const NaatCardMenu: React.FC<NaatCardMenuProps> = ({
  visible,
  anchor,
  selectedNaat,
  savedPlaybackMode,
  onClose,
  onDownload,
  onAlternatePlay,
  onNotForYou,
  isFavorite = false,
  onToggleFavorite,
  isDownloaded = false,
  showDownload = true,
  onExcluded,
  onBestChanged,
  onPlayNext,
  onAddToQueue,
}) => {
  const [menuHeight, setMenuHeight] = useState(0);
  const [isUpdatingExclude, setIsUpdatingExclude] = useState(false);
  const [isUpdatingBest, setIsUpdatingBest] = useState(false);
  const [bestValue, setBestValue] = useState(selectedNaat?.best ?? false);
  const { user } = useAuth();
  const isAdmin = user?.labels?.includes("admin") ?? false;

  React.useEffect(() => {
    setBestValue(selectedNaat?.best ?? false);
  }, [selectedNaat?.$id, selectedNaat?.best]);

  const handleShare = async () => {
    if (selectedNaat) {
      onClose();
      await shareService.shareNaat(selectedNaat);
    }
  };

  const handleToggleExclude = async () => {
    if (!selectedNaat || isUpdatingExclude) return;
    const exclude = !selectedNaat.exclude;
    setIsUpdatingExclude(true);
    try {
      await appwriteService.setNaatExcluded(selectedNaat.$id, exclude);
      onClose();
      onExcluded?.(selectedNaat.$id, exclude);
      showSuccessToast(
        exclude ? "Naat excluded from the app" : "Naat restored to the app",
      );
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "Unable to update naat",
      );
    } finally {
      setIsUpdatingExclude(false);
    }
  };

  const handleToggleBest = async () => {
    if (!selectedNaat || isUpdatingBest) return;
    const best = !bestValue;
    setIsUpdatingBest(true);
    try {
      await appwriteService.setNaatBest(selectedNaat.$id, best);
      setBestValue(best);
      onClose();
      onBestChanged?.(selectedNaat.$id, best);
      showSuccessToast(best ? "Naat added as best" : "Naat removed from best");
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "Unable to update naat",
      );
    } finally {
      setIsUpdatingBest(false);
    }
  };

  const items: MenuItem[] = [];
  if (showDownload && onDownload) {
    items.push({
      key: "download",
      label: isDownloaded ? "Downloaded" : "Download",
      icon: isDownloaded ? "checkmark-circle" : "download-outline",
      color: colors.text.primary,
      onPress: onDownload,
    });
  }
  if (onToggleFavorite) {
    items.push({
      key: "favorite",
      label: isFavorite ? "Remove from favorites" : "Add to favorites",
      icon: isFavorite ? "heart" : "heart-outline",
      color: isFavorite ? colors.accent.error : colors.text.primary,
      onPress: onToggleFavorite,
    });
  }
  items.push({
    key: "play-next",
    label: "Play next",
    icon: "play-skip-forward-outline",
    color: colors.text.primary,
    onPress: () => {
      onClose();
      if (selectedNaat) onPlayNext?.(selectedNaat);
    },
  });
  items.push({
    key: "add-to-queue",
    label: "Add to queue",
    icon: "list-outline",
    color: colors.text.primary,
    onPress: () => {
      onClose();
      if (selectedNaat) onAddToQueue?.(selectedNaat);
    },
  });
  items.push({
    key: "alternate-play",
    label: savedPlaybackMode === "audio" ? "Play as video" : "Play as audio",
    icon:
      savedPlaybackMode === "audio"
        ? "videocam-outline"
        : "musical-notes-outline",
    color: colors.text.primary,
    onPress: onAlternatePlay,
  });
  items.push({
    key: "share",
    label: "Share",
    icon: "share-outline",
    color: colors.text.primary,
    onPress: handleShare,
  });
  if (onNotForYou) {
    items.push({
      key: "not-for-you",
      label: "Not for you",
      icon: "close-circle-outline",
      color: colors.text.tertiary,
      onPress: onNotForYou,
    });
  }
  if (isAdmin && selectedNaat) {
    items.push({
      key: "best",
      label: isUpdatingBest
        ? "Updating..."
        : bestValue
          ? "Remove from best"
          : "Add as best",
      icon: bestValue ? "star" : "star-outline",
      color: colors.accent.warning,
      onPress: () => void handleToggleBest(),
    });
    items.push({
      key: "exclude",
      label: isUpdatingExclude
        ? "Updating..."
        : selectedNaat.exclude
          ? "Restore to app"
          : "Exclude from app",
      icon: selectedNaat.exclude
        ? "checkmark-circle-outline"
        : "eye-off-outline",
      color: colors.accent.warning,
      onPress: () => void handleToggleExclude(),
    });
  }

  // Position menu near the anchor, clamped to screen edges.
  // If it would overflow the bottom, flip it above the anchor.
  const flipAbove = (anchor?.y ?? 0) + menuHeight + EDGE_MARGIN > SCREEN_HEIGHT;
  const left = Math.min(
    Math.max(anchor?.x ?? 0, EDGE_MARGIN),
    SCREEN_WIDTH - MENU_WIDTH - EDGE_MARGIN,
  );
  const top = flipAbove
    ? Math.max((anchor?.y ?? 0) - menuHeight - EDGE_MARGIN, EDGE_MARGIN)
    : (anchor?.y ?? 0) + EDGE_MARGIN;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Dismissal layer */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Menu card */}
        <View
          onLayout={(e) => setMenuHeight(e.nativeEvent.layout.height)}
          style={[
            styles.menu,
            {
              left,
              top,
              width: MENU_WIDTH,
              maxHeight: MENU_MAX_HEIGHT,
              backgroundColor: colors.background.elevated,
            },
          ]}
        >
          <ScrollView bounces={false}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={item.onPress}
                style={styles.item}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon} size={19} color={item.color} />
                <Text
                  className="ml-3 text-sm font-medium"
                  style={{ color: item.color }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  menu: {
    position: "absolute",
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});

export default NaatCardMenu;
