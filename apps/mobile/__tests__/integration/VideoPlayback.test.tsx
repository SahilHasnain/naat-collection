/**
 * Integration tests for Video Playback with Position Saving
 * Tests playback position persistence and resume functionality
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import PlayerScreen from "../../app/player/[id]";
import { appwriteService } from "../../services/appwrite";
import { storageService } from "../../services/storage";
import type { Naat } from "../../types";

// Mock the services
jest.mock("../../services/appwrite");
jest.mock("../../services/storage");

const mockNaat: Naat = {
  $id: "test-naat-1",
  title: "Test Naat for Playback",
  videoUrl: "https://youtube.com/watch?v=test1",
  thumbnailUrl: "https://example.com/thumb1.jpg",
  duration: 300,
  uploadDate: "2024-01-01T00:00:00.000Z",
  channelName: "Test Channel",
  channelId: "channel1",
  youtubeId: "test1",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("Video Playback Integration Tests", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "test-naat-1" });
    (storageService.getPlaybackPosition as jest.Mock).mockResolvedValue(null);
    (storageService.savePlaybackPosition as jest.Mock).mockResolvedValue(
      undefined
    );
    (storageService.clearPlaybackPosition as jest.Mock).mockResolvedValue(
      undefined
    );
  });

  describe("Playback Position Saving", () => {
    it("should load naat and display video player", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (appwriteService.getNaatById as jest.Mock).mockResolvedValue(mockNaat);

      render(<PlayerScreen />);

      await waitFor(
        () => {
          expect(screen.getByText("Test Naat for Playback")).toBeTruthy();
        },
        { timeout: 10000 }
      );

      expect(appwriteService.getNaatById).toHaveBeenCalledWith("test-naat-1");
    });

    it("should display resume prompt when saved position exists", async () => {
      const savedPosition = {
        naatId: "test-naat-1",
        position: 120,
        timestamp: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === "@naat_playback_test-naat-1") {
          return Promise.resolve(JSON.stringify(savedPosition));
        }
        return Promise.resolve(null);
      });
      (storageService.getPlaybackPosition as jest.Mock).mockResolvedValue(120);
      (appwriteService.getNaatById as jest.Mock).mockResolvedValue(mockNaat);

      render(<PlayerScreen />);

      await waitFor(
        () => {
          expect(screen.getByText("Resume Playback?")).toBeTruthy();
        },
        { timeout: 10000 }
      );

      expect(screen.getByText(/2:00/)).toBeTruthy();
    });
  });

  describe("Error Handling", () => {
    it("should display error when naat fails to load", async () => {
      (appwriteService.getNaatById as jest.Mock).mockRejectedValue(
        new Error("Failed to load naat")
      );

      render(<PlayerScreen />);

      await waitFor(
        () => {
          expect(screen.getByText("Failed to load naat")).toBeTruthy();
        },
        { timeout: 10000 }
      );
    });
  });
});
