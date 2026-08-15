import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import type { MenuAnchor } from "@/types";
import Pressable from "./ResponsivePressable";

interface KebabMenuButtonProps {
  onPress: (anchor: MenuAnchor) => void;
  /** Icon color. Defaults to white (works over thumbnails and dark bg). */
  color?: string;
  /** Background chip color. Defaults to a semi-transparent dark scrim. */
  backgroundColor?: string;
  size?: number;
  hitSlop?: number;
  testID?: string;
}

/**
 * A "⋯" overflow menu button used on media cards to open the context menu.
 * Measures its own on-screen position so the caller can anchor the menu
 * near the card that was tapped.
 */
const KebabMenuButton: React.FC<KebabMenuButtonProps> = ({
  onPress,
  color = "#ffffff",
  backgroundColor = "rgba(0,0,0,0.45)",
  size = 18,
  hitSlop = 10,
  testID,
}) => {
  const ref = React.useRef<View>(null);

  const handlePress = React.useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      onPress({ x, y: y + height });
    });
  }, [onPress]);

  return (
    <Pressable
      ref={ref}
      onPress={handlePress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel="More options"
      testID={testID}
    >
      <View
        style={[
          styles.chip,
          { backgroundColor, width: size + 14, height: size + 14 },
        ]}
      >
        <Ionicons name="ellipsis-horizontal" size={size} color={color} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default KebabMenuButton;