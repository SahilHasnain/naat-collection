import { colors } from "@/constants/theme";
import { shareService } from "@/services/shareService";
import type { Naat } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface NaatActionSheetProps {
    visible: boolean;
    selectedNaat: Naat | null;
    savedPlaybackMode: "audio" | "video";
    onClose: () => void;
    onDownload?: () => void;
    onAlternatePlay: () => void;
    isDownloaded?: boolean;
    showDownload?: boolean;
}

const NaatActionSheet: React.FC<NaatActionSheetProps> = ({
    visible,
    selectedNaat,
    savedPlaybackMode,
    onClose,
    onDownload,
    onAlternatePlay,
    isDownloaded = false,
    showDownload = true,
}) => {
    const handleShare = async () => {
        if (selectedNaat) {
            onClose();
            await shareService.shareNaat(selectedNaat);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View
                className="flex-1 justify-end"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={onClose}
                    style={{ flex: 1 }}
                />
                <SafeAreaView
                    edges={["bottom"]}
                    className="px-6 pt-3 rounded-t-3xl"
                    style={{
                        backgroundColor: colors.background.secondary,
                        paddingBottom: 16,
                    }}
                >
                    <View className="items-center mb-3">
                        <View
                            className="rounded-full"
                            style={{
                                width: 40,
                                height: 4,
                                backgroundColor: colors.text.tertiary,
                            }}
                        />
                    </View>

                    <View className="flex-row items-stretch" style={{ gap: 10 }}>
                        {showDownload && onDownload && (
                            <TouchableOpacity
                                onPress={onDownload}
                                className="rounded-2xl px-4 py-4 flex-row items-center justify-center flex-1"
                                style={{ backgroundColor: colors.accent.primary }}
                                disabled={!selectedNaat}
                                activeOpacity={0.88}
                            >
                                <Ionicons
                                    name={isDownloaded ? "checkmark-circle" : "download-outline"}
                                    size={20}
                                    color="#ffffff"
                                />
                                <Text
                                    className="ml-2 text-sm font-semibold"
                                    style={{ color: "#ffffff" }}
                                    numberOfLines={1}
                                >
                                    Download
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={onAlternatePlay}
                            className="rounded-2xl px-4 py-4 flex-row items-center justify-center flex-1"
                            style={{ backgroundColor: colors.accent.secondary }}
                            disabled={!selectedNaat}
                            activeOpacity={0.88}
                        >
                            <Ionicons
                                name={
                                    savedPlaybackMode === "audio"
                                        ? "videocam-outline"
                                        : "musical-notes-outline"
                                }
                                size={20}
                                color="#ffffff"
                            />
                            <Text
                                className="ml-2 text-sm font-semibold"
                                style={{ color: "#ffffff" }}
                                numberOfLines={1}
                            >
                                {savedPlaybackMode === "audio"
                                    ? "Play as video"
                                    : "Play as audio"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row items-stretch mt-2.5" style={{ gap: 10 }}>
                        <TouchableOpacity
                            onPress={handleShare}
                            className="rounded-2xl px-4 py-4 flex-row items-center justify-center flex-1"
                            style={{ backgroundColor: colors.background.elevated }}
                            disabled={!selectedNaat}
                            activeOpacity={0.88}
                        >
                            <Ionicons
                                name="share-outline"
                                size={20}
                                color={colors.text.primary}
                            />
                            <Text
                                className="ml-2 text-sm font-semibold"
                                style={{ color: colors.text.primary }}
                                numberOfLines={1}
                            >
                                Share
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

export default NaatActionSheet;
