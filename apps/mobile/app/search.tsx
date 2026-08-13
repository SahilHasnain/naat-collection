import { colors } from "@/constants/theme";
import { useSearch } from "@/contexts/SearchContext";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

/**
 * Search tab entry point.
 *
 * The search bar itself lives in the global AnimatedHeader. Tapping the Search
 * tab in the tab bar is intercepted there (see AnimatedTabBar), so this screen
 * only ever renders for deep links / direct navigation — in which case it
 * activates search and redirects to the home feed.
 */
export default function SearchScreen() {
  const router = useRouter();
  const { requestSearchFocus } = useSearch();

  useEffect(() => {
    requestSearchFocus();
    router.replace("/home");
  }, [requestSearchFocus, router]);

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background.primary }}
    />
  );
}
