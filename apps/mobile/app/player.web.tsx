import FullPlayerModal from "@/components/FullPlayerModal";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Redirect } from "expo-router";
import React from "react";

export default function PlayerWebScreen() {
  const { currentAudio } = useAudioPlayer();

  if (!currentAudio) {
    return <Redirect href="/home" />;
  }

  return <FullPlayerModal />;
}
