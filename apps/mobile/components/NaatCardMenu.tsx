import { colors } from "@/constants/theme";
import { shareService } from "@/services/shareService";
import type { MenuAnchor, Naat } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MENU_WIDTH = 220;
const MENU_MAX_HEIGHT = 320;
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
  isDownloaded?: boolean;
  showDownload?: boolean;
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
  isDownloaded = false,
  showDownload = true,
}) => {
  const [menuHeight, setMenuHeight] = useState(0);

  const handleShare = async () => {
    if (selectedNaat) {
      onClose();
      await shareService.shareNaat(selectedNaat);
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
  items.push({
    key: "alternate-play",
    label:
      savedPlaybackMode === "audio" ? "Play as video" : "Play as audio",
    icon:
      savedPlaybackMode === "audio" ? "videocam-outline" : "musical-notes-outline",
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

  // Position menu near the anchor, clamped to screen edges.
  // If it would overflow the bottom, flip it above the anchor.
  const flipAbove =
    (anchor?.y ?? 0) + menuHeight + EDGE_MARGIN > SCREEN_HEIGHT;
  const left = Math.min(
    Math.max((anchor?.x ?? 0), EDGE_MARGIN),
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