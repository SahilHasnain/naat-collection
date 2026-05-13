import React from "react";
import { Text, View } from "react-native";

export default function DownloadsWebScreen() {
  return (
    <View
      style={{
        minHeight: 420,
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <Text style={{ color: "#f8fbff", fontSize: 28, fontWeight: "800" }}>
        Downloads stay on mobile
      </Text>
      <Text
        style={{
          color: "rgba(255,255,255,0.56)",
          marginTop: 10,
          textAlign: "center",
          maxWidth: 520,
        }}
      >
        Downloads are available in the app.
      </Text>
    </View>
  );
}
