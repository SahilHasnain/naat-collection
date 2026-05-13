import { colors } from "@/constants/theme";
import { useSearch as useSearchContext } from "@/contexts/SearchContext";
import { useHomeFilters } from "@/hooks/useHomeFilters";
import { useNaatPlayback } from "@/hooks/useNaatPlayback";
import { getPreferredDuration } from "@naat-collection/shared";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

export default function HomeWebScreen() {
  const filters = useHomeFilters();
  const { handleNaatPress } = useNaatPlayback(filters.displayData);
  const {
    searchInput,
    setSearchInput,
    setActiveSearchQuery,
    activateSearch,
    deactivateSearch,
    submitSearch,
  } = useSearchContext();
  const { loadMore, setQuery } = filters;

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed) {
      activateSearch();
      submitSearch(trimmed);
    } else {
      deactivateSearch();
    }
    setActiveSearchQuery(trimmed);
    setQuery(trimmed);
  }, [
    activateSearch,
    deactivateSearch,
    searchInput,
    setActiveSearchQuery,
    setQuery,
    submitSearch,
  ]);

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <View>
          <Text style={{ color: "#f9fbff", fontSize: 32, fontWeight: "800" }}>
            Browse naats
          </Text>
        </View>
        <View
          style={{
            width: 300,
            borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <TextInput
            placeholder="Search naats"
            placeholderTextColor="rgba(255,255,255,0.34)"
            value={searchInput}
            onChangeText={setSearchInput}
            style={{ color: "#fff", outlineStyle: "none" as any }}
          />
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {["forYou", "latest", "popular", "oldest"].map((item) => {
          const active = filters.selectedFilter === item;
          return (
            <Pressable
              key={item}
              onPress={() => filters.setSelectedFilter(item as any)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: active
                  ? "rgba(37,99,235,0.2)"
                  : "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: active
                  ? "rgba(96,165,250,0.4)"
                  : "rgba(255,255,255,0.06)",
              }}
            >
              <Text style={{ color: "#fff", textTransform: "capitalize" }}>
                {item === "forYou" ? "For you" : item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filters.isLoading && filters.displayData.length === 0 ? (
        <View style={{ paddingVertical: 80, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent.secondary} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -10 }}>
          {filters.displayData.map((item) => (
            <View
              key={item.$id}
              style={{ width: "33.3333%", paddingHorizontal: 10, marginBottom: 20 }}
            >
              <Pressable
                onPress={() => {
                  void handleNaatPress(item.$id);
                }}
                style={{
                  borderRadius: 22,
                  overflow: "hidden",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <View
                  style={{
                    aspectRatio: 16 / 9,
                    backgroundColor: colors.background.tertiary,
                  }}
                >
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </View>
                <View style={{ padding: 16 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: "#f8fbff",
                      fontSize: 16,
                      fontWeight: "700",
                      lineHeight: 22,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.54)", marginTop: 10 }}>
                    {item.channelName}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.42)", marginTop: 4 }}>
                    {Math.floor(getPreferredDuration(item) / 60)} min
                  </Text>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
