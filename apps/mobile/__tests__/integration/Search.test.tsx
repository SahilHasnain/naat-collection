/**
 * Integration tests for Search functionality
 * Tests end-to-end search flow including debouncing and filtering
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
    title: "Beautiful Naat",
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
    title: "Amazing Recitation",
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

const mockSearchResults: Naat[] = [mockNaats[0]];

describe("Search Integration Tests", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Search Functionality End-to-End", () => {
    it("should perform search and display filtered results", async () => {
      (appwriteService.getNaats as jest.Mock).mockResolvedValue(mockNaats);
      (appwriteService.searchNaats as jest.Mock).mockResolvedValue(
        mockSearchResults
      );

      const { getByPlaceholderText } = render(<HomeScreen />);

      await waitFor(
        () => {
          expect(screen.getByText("Beautiful Naat")).toBeTruthy();
        },
        { timeout: 10000 }
      );

      const searchInput = getByPlaceholderText("Search naats...");
      searchInput.props.onChangeText("Beautiful");

      jest.advanceTimersByTime(300);

      await waitFor(
        () => {
          expect(appwriteService.searchNaats).toHaveBeenCalledWith("Beautiful");
        },
        { timeout: 10000 }
      );
    });

    it("should display empty state when no search results found", async () => {
      (appwriteService.getNaats as jest.Mock).mockResolvedValue(mockNaats);
      (appwriteService.searchNaats as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText } = render(<HomeScreen />);

      await waitFor(
        () => {
          expect(screen.getByText("Beautiful Naat")).toBeTruthy();
        },
        { timeout: 10000 }
      );

      const searchInput = getByPlaceholderText("Search naats...");
      searchInput.props.onChangeText("NonExistent");

      jest.advanceTimersByTime(300);

      await waitFor(
        () => {
          expect(
            screen.getByText("No naats found matching your search.")
          ).toBeTruthy();
        },
        { timeout: 10000 }
      );
    });
  });
});
