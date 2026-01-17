/**
 * Integration tests for HomeScreen
 * Tests data loading, display, and user interactions
 */

import { render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";
import HomeScreen from "../../app/index";
import { appwriteService } from "../../services/appwrite";
import type { Naat } from "../../types";

// Mock the services
jest.mock("../../services/appwrite");
jest.mock("../../services/storage");

const mockNaats: Naat[] = [
  {
    $id: "1",
    title: "Test Naat 1",
    videoUrl: "https://youtube.com/watch?v=test1",
    thumbnailUrl: "https://example.com/thumb1.jpg",
    duration: 300,
    uploadDate: "2024-01-01T00:00:00.000Z",
    channelName: "Test Channel",
    channelId: "channel1",
    youtubeId: "test1",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    $id: "2",
    title: "Test Naat 2",
    videoUrl: "https://youtube.com/watch?v=test2",
    thumbnailUrl: "https://example.com/thumb2.jpg",
    duration: 240,
    uploadDate: "2024-01-02T00:00:00.000Z",
    channelName: "Test Channel",
    channelId: "channel1",
    youtubeId: "test2",
    createdAt: "2024-01-02T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  },
];

describe("HomeScreen Integration Tests", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe("Data Loading and Display", () => {
    it("should load and display naats on mount", async () => {
      (appwriteService.getNaats as jest.Mock).mockResolvedValue(mockNaats);

      render(<HomeScreen />);

      await waitFor(
        () => {
          expect(screen.getByText("Test Naat 1")).toBeTruthy();
        },
        { timeout: 10000 }
      );

      expect(screen.getByText("Test Naat 2")).toBeTruthy();
      expect(appwriteService.getNaats).toHaveBeenCalled();
    });

    it("should display empty state when no naats are available", async () => {
      (appwriteService.getNaats as jest.Mock).mockResolvedValue([]);

      render(<HomeScreen />);

      await waitFor(
        () => {
          expect(
            screen.getByText("No naats available yet. Check back soon!")
          ).toBeTruthy();
        },
        { timeout: 10000 }
      );
    });

    it("should display error state when API fails", async () => {
      (appwriteService.getNaats as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      render(<HomeScreen />);

      await waitFor(
        () => {
          expect(
            screen.getByText(
              "Unable to connect. Please check your internet connection."
            )
          ).toBeTruthy();
        },
        { timeout: 10000 }
      );
    });
  });
});
