import { colors } from "@/constants/theme";
import { useHistory } from "@/hooks/useHistory";
import { useNaatPlayback } from "@/hooks/useNaatPlayback";
import { formatRelativeTime } from "@/utils/dateGrouping";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export default function HistoryWebScreen() {
  const { history, loading } = useHistory();
  const { handleNaatPress } = useNaatPlayback(history);

  return (
    <View>
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: "#f9fbff", fontSize: 32, fontWeight: "800" }}>
          History
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.56)", marginTop: 6 }}>
          Pick up from your recent listening sessions.
        </Text>
      </View>

      {loading && history.length === 0 ? (
        <View style={{ paddingVertical: 80, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent.secondary} />
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {history.map((item) => (
            <Pressable
              key={item.$id}
              onPress={() => {
                void handleNaatPress(item.$id);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderRadius: 22,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <View
                style={{
                  width: 180,
                  aspectRatio: 16 / 9,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: colors.background.tertiary,
                }}
              >
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: "#f8fbff", fontSize: 17, fontWeight: "700" }}
                >
                  {item.title}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.56)", marginTop: 8 }}>
                  {item.channelName}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.42)", marginTop: 6 }}>
                  {formatRelativeTime(item.uploadDate)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
