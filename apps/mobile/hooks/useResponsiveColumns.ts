import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useLayoutMode } from "@/contexts/LayoutModeContext";
import { useWindowDimensions } from "react-native";

export const WEB_MAX_CONTENT_WIDTH = 1248;
const DESIRED_CARD_WIDTH = 264;

interface ResponsiveColumns {
  columns: number;
  maxContentWidth: number | undefined;
}

export const useResponsiveColumns = (): ResponsiveColumns => {
  const { width } = useWindowDimensions();
  const { layoutMode } = useLayoutMode();
  const { isDesktopWeb } = useResponsiveLayout();

  if (layoutMode === "youtube") {
    return {
      columns: 1,
      maxContentWidth: isDesktopWeb ? 720 : undefined,
    };
  }

  if (!isDesktopWeb) {
    return { columns: 2, maxContentWidth: undefined };
  }

  const availableWidth = Math.min(width, WEB_MAX_CONTENT_WIDTH);
  const columns = Math.max(
    2,
    Math.min(5, Math.floor(availableWidth / DESIRED_CARD_WIDTH)),
  );
  return { columns, maxContentWidth: WEB_MAX_CONTENT_WIDTH };
};