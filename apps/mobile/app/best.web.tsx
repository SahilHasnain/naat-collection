import { colors } from "@/constants/theme";
import { useNaatPlayback } from "@/hooks/useNaatPlayback";
import { appwriteService } from "@/services/appwrite";
import type { Naat } from "@/types";
import { getPreferredDuration } from "@naat-collection/shared";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

const POPULAR_FETCH_LIMIT = 500;
const BEST_COUNT = 100;

function shuffleAndPick<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export default function BestWebScreen() {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState(true);
  const { handleNaatPress } = useNaatPlayback(naats);

  const loadBest = useCallback(async () => {
    setLoading(true);
    try {
      const popular = await appwriteService.getNaats(
        POPULAR_FETCH_LIMIT,
        0,
        "popular",
      );
      setNaats(shuffleAndPick(popular, BEST_COUNT));
    } catch (error) {
      console.error("Failed to load best naats:", error);
      setNaats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBest();
  }, [loadBest]);

  return (
    <View>
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: "#f9fbff", fontSize: 32, fontWeight: "800" }}>
          Best naats
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.56)", marginTop: 6 }}>
          A hand-picked mix of the top 100 most popular naats.
        </Text>
      </View>

      {loading && naats.length === 0 ? (
        <View style={{ paddingVertical: 80, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent.secondary} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -10 }}>
          {naats.map((item) => (
            <View
              key={item.$id}
              style={{
                width: "33.3333%",
                paddingHorizontal: 10,
                marginBottom: 20,
              }}
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
