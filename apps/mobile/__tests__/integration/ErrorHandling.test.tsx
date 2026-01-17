/**
 * Integration tests for Error Handling scenarios
 * Tests error states, retry mechanisms, and fallback behaviors
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";
import HomeScreen from "../../app/index";
import { appwriteService } from "../../services/appwrite";
import { AppError, ErrorCode, type Naat } from "../../types";

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
];

describe("Error Handling Integration Tests", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe("Network Error Handling", () => {
    it("should display network error message when API is unreachable", async () => {
      (appwriteService.getNaats as jest.Mock).mockRejectedValue(
        new AppError(
          "Unable to load naats. Please check your internet connection.",
          ErrorCode.NETWORK_ERROR,
          true
        )
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

      expect(screen.getByText("Retry")).toBeTruthy();
    });

    it("should retry loading data when retry button is pressed", async () => {
      (appwriteService.getNaats as jest.Mock)
        .mockRejectedValueOnce(
          new AppError(
            "Unable to load naats. Please check your internet connection.",
            ErrorCode.NETWORK_ERROR,
            true
          )
        )
        .mockResolvedValueOnce(mockNaats);

      const { getByText } = render(<HomeScreen />);

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

      const retryButton = getByText("Retry");
      fireEvent.press(retryButton);

      await waitFor(
        () => {
          expect(screen.getByText("Test Naat 1")).toBeTruthy();
        },
        { timeout: 10000 }
      );

      expect(appwriteService.getNaats).toHaveBeenCalledTimes(2);
    });
  });

  describe("Search Error Handling", () => {
    it("should handle search errors gracefully", async () => {
      (appwriteService.getNaats as jest.Mock).mockResolvedValue(mockNaats);
      (appwriteService.searchNaats as jest.Mock).mockRejectedValue(
        new Error("Search failed")
      );

      const { getByPlaceholderText } = render(<HomeScreen />);

      await waitFor(
        () => {
          expect(screen.getByText("Test Naat 1")).toBeTruthy();
        },
        { timeout: 10000 }
      );

      const searchInput = getByPlaceholderText("Search naats...");
      searchInput.props.onChangeText("test");

      jest.useFakeTimers();
      jest.advanceTimersByTime(300);
      jest.useRealTimers();

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
