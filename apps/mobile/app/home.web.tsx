import { colors } from "@/constants/theme";
import { useSearch as useSearchContext } from "@/contexts/SearchContext";
import { useHomeFilters } from "@/hooks/useHomeFilters";
import { useNaatPlayback } from "@/hooks/useNaatPlayback";
import { storageService } from "@/services/storage";
import { Ionicons } from "@expo/vector-icons";
import { getPreferredDuration } from "@naat-collection/shared";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from "react-native";

const durationOptions = [
  { value: "all", label: "All lengths" },
  { value: "short", label: "Short under 5 min" },
  { value: "medium", label: "Medium 5 to 15 min" },
  { value: "long", label: "Long over 15 min" },
] as const;

export default function HomeWebScreen() {
  const filters = useHomeFilters();
  const { handleNaatPress, playAsAudio, playAsVideo } = useNaatPlayback(
    filters.displayData,
  );
  const {
    searchInput,
    setSearchInput,
    setActiveSearchQuery,
    activateSearch,
    deactivateSearch,
    submitSearch,
  } = useSearchContext();
  const { loadMore, setQuery } = filters;
  const [menuOpenFor, setMenuOpenFor] = React.useState<string | null>(null);
  const [savedPlaybackMode, setSavedPlaybackMode] = React.useState<"audio" | "video">(
    "audio",
  );

  const usingSearchFilters = searchInput.trim().length > 0;
  const activeChannelId = usingSearchFilters
    ? filters.searchChannelId
    : filters.selectedChannelId;
  const activeDuration = usingSearchFilters
    ? filters.searchDuration
    : filters.selectedDuration;
  const activePureOnly = usingSearchFilters
    ? filters.searchPureOnly
    : filters.pureOnly;

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

  const toggleCardMenu = async (naatId: string) => {
    if (menuOpenFor === naatId) {
      setMenuOpenFor(null);
      return;
    }

    try {
      const mode = (await storageService.loadPlaybackMode()) || "audio";
      setSavedPlaybackMode(mode);
    } catch {
      setSavedPlaybackMode("audio");
    }

    setMenuOpenFor(naatId);
  };

  const handleAlternatePlay = async (naatId: string) => {
    setMenuOpenFor(null);

    if (savedPlaybackMode === "audio") {
      await playAsVideo(naatId);
      return;
    }

    await playAsAudio(naatId);
  };

  const handleChannelChange = (nextValue: string) => {
    const nextChannelId = nextValue || null;
    if (usingSearchFilters) {
      filters.setSearchChannelId(nextChannelId);
      return;
    }
    filters.setSelectedChannelId(nextChannelId);
  };

  const handleDurationChange = (nextValue: string) => {
    const nextDuration = nextValue as (typeof durationOptions)[number]["value"];
    if (usingSearchFilters) {
      filters.setSearchDuration(nextDuration);
      return;
    }
    filters.setSelectedDuration(nextDuration);
  };

  const handlePureToggle = (nextValue: boolean) => {
    if (usingSearchFilters) {
      filters.setSearchPureOnly(nextValue);
      return;
    }
    filters.setPureOnly(nextValue);
  };

  const handleResetFilters = () => {
    if (usingSearchFilters) {
      filters.setSearchChannelId(null);
      filters.setSearchDuration("all");
      filters.setSearchPureOnly(false);
      return;
    }

    filters.setSelectedChannelId(null);
    filters.setSelectedDuration("all");
    filters.setPureOnly(false);
  };

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
            width: 320,
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
          marginBottom: 24,
          borderRadius: 24,
          backgroundColor: "rgba(255,255,255,0.04)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
          padding: 18,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 14,
            gap: 16,
          }}
        >
          <View>
            <Text style={{ color: "#f9fbff", fontSize: 18, fontWeight: "700" }}>
              Refine results
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {usingSearchFilters
                ? "Search filters apply to matching naats."
                : "Filters shape your main feed."}
            </Text>
          </View>
          {(filters.hasActiveHomeFilters || usingSearchFilters) && (
            <Pressable
              onPress={handleResetFilters}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                Reset filters
              </Text>
            </Pressable>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginBottom: 16,
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

        <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text
              style={{
                color: "rgba(255,255,255,0.62)",
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Channel
            </Text>
            <select
              value={activeChannelId ?? ""}
              onChange={(event) => handleChannelChange(event.target.value)}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "#f8fbff",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "0 14px",
                outline: "none",
              }}
            >
              <option value="">All channels</option>
              {filters.channels
                .filter((channel) => !channel.isOther)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
            </select>
            {filters.channelsLoading ? (
              <Text style={{ color: "rgba(255,255,255,0.4)", marginTop: 6, fontSize: 12 }}>
                Loading channels...
              </Text>
            ) : null}
          </View>

          <View style={{ flex: 1, minWidth: 220 }}>
            <Text
              style={{
                color: "rgba(255,255,255,0.62)",
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Duration
            </Text>
            <select
              value={activeDuration}
              onChange={(event) => handleDurationChange(event.target.value)}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "#f8fbff",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "0 14px",
                outline: "none",
              }}
            >
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </View>

          <View
            style={{
              minWidth: 220,
              flex: 1,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.05)",
              borderWidth: 1,
              borderColor: activePureOnly
                ? "rgba(96,165,250,0.35)"
                : "rgba(255,255,255,0.06)",
              paddingHorizontal: 14,
              paddingVertical: 12,
              justifyContent: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#f8fbff", fontWeight: "700" }}>
                  Pure audio only
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.5)", marginTop: 4, fontSize: 12 }}>
                  Show naats with cut audio available.
                </Text>
              </View>
              <Switch
                value={activePureOnly}
                onValueChange={handlePureToggle}
                trackColor={{
                  false: "rgba(255,255,255,0.14)",
                  true: "rgba(37,99,235,0.5)",
                }}
                thumbColor={activePureOnly ? "#dbeafe" : "#f4f4f5"}
              />
            </View>
          </View>
        </View>
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
              style={{
                width: "33.3333%",
                paddingHorizontal: 10,
                marginBottom: 20,
                position: "relative",
              }}
            >
              <Pressable
                onPress={() => {
                  setMenuOpenFor(null);
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
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    void toggleCardMenu(item.$id);
                  }}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(4,8,14,0.72)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
                </Pressable>
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

              {menuOpenFor === item.$id ? (
                <View
                  style={{
                    position: "absolute",
                    top: 58,
                    right: 22,
                    width: 200,
                    borderRadius: 18,
                    backgroundColor: "rgba(9,14,22,0.98)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                    padding: 8,
                    zIndex: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.28,
                    shadowRadius: 24,
                    elevation: 12,
                  }}
                >
                  <Pressable
                    onPress={() => {
                      void handleAlternatePlay(item.$id);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      backgroundColor: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <Ionicons
                      name={
                        savedPlaybackMode === "audio"
                          ? "videocam-outline"
                          : "musical-notes-outline"
                      }
                      size={18}
                      color="#fff"
                    />
                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                      {savedPlaybackMode === "audio"
                        ? "Play as video"
                        : "Play as audio"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
