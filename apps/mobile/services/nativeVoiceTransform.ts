import { DeviceEventEmitter, NativeModules, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

type NativeVoiceTransformModule = {
  transform(sourcePath: string, preset: "subtle" | "younger" | "high"): Promise<string>;
};

const nativeVoiceTransform = NativeModules.NativeVoiceTransform as
  | NativeVoiceTransformModule
  | undefined;

export function isNativeVoiceTransformAvailable(): boolean {
  return Platform.OS === "android" && Boolean(nativeVoiceTransform);
}

export async function transformVoiceOnDevice(
  sourcePath: string,
  preset: "subtle" | "younger" | "high",
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (!nativeVoiceTransform) {
    throw new Error("Native voice transformation is unavailable on this platform");
  }
  const subscription = onProgress
    ? DeviceEventEmitter.addListener("nativeVoiceTransformProgress", (event) => {
        if (event.sourcePath === sourcePath) onProgress(event.progress);
      })
    : undefined;
  try {
    const outputPath = await nativeVoiceTransform.transform(sourcePath, preset);
    return outputPath.startsWith("file://") ? outputPath : `file://${outputPath}`;
  } finally {
    subscription?.remove();
  }
}

export async function transformVoiceUrlOnDevice(
  audioId: string,
  audioUrl: string,
  preset: "subtle" | "younger" | "high",
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (!isNativeVoiceTransformAvailable() || !FileSystem.cacheDirectory) {
    throw new Error("Native voice transformation is unavailable on this platform");
  }

  const inputDirectory = `${FileSystem.cacheDirectory}voice-transform-input/`;
  await FileSystem.makeDirectoryAsync(inputDirectory, { intermediates: true });
  const sourcePath = `${inputDirectory}${audioId}.source`;
  const sourceInfo = await FileSystem.getInfoAsync(sourcePath);
  if (!sourceInfo.exists) {
    console.log("[NativeVoiceTransform] Downloading source", { audioId, audioUrl });
    await FileSystem.downloadAsync(audioUrl, sourcePath);
    console.log("[NativeVoiceTransform] Source downloaded", { sourcePath });
  } else {
    console.log("[NativeVoiceTransform] Using cached source", { sourcePath });
  }

  console.log("[NativeVoiceTransform] Starting native transform", { sourcePath, preset });
  return transformVoiceOnDevice(sourcePath, preset, onProgress);
}
