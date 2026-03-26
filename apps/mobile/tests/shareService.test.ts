/**
 * Tests for Share Service
 * 
 * Note: These are basic unit tests. Full integration testing requires
 * running on a physical device or emulator with share capabilities.
 */

import type { Naat } from "@naat-collection/shared";
import { Share } from "react-native";
import { shareService } from "../services/shareService";

// Mock React Native Share
jest.mock("react-native", () => ({
  Share: {
    share: jest.fn(),
    sharedAction: "sharedAction",
    dismissedAction: "dismissedAction",
  },
  Platform: {
    OS: "ios",
  },
}));

// Mock Sentry
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock toast utilities
jest.mock("../utils/toast", () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

describe("shareService", () => {
  const mockNaat: Naat = {
    $id: "test-id",
    title: "Test Naat Title",
    videoUrl: "https://youtube.com/watch?v=test",
    thumbnailUrl: "https://example.com/thumb.jpg",
    duration: 300,
    uploadDate: "2024-01-01T00:00:00Z",
    channelName: "Test Channel",
    channelId: "test-channel-id",
    youtubeId: "test-youtube-id",
    views: 1000,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("shareNaat", () => {
    it("should share naat with default options", async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      const result = await shareService.shareNaat(mockNaat);

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Test Naat Title"),
          title: "Test Naat Title",
        }),
        expect.any(Object)
      );
      expect(result).toBe(true);
    });

    it("should include channel name when requested", async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      await shareService.shareNaat(mockNaat, { includeChannelName: true });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Test Channel"),
        }),
        expect.any(Object)
      );
    });

    it("should include YouTube URL when requested", async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      await shareService.shareNaat(mockNaat, { includeUrl: true });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("youtu.be/test-youtube-id"),
        }),
        expect.any(Object)
      );
    });

    it("should use custom message when provided", async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      const customMessage = "Check out this amazing naat!";
      await shareService.shareNaat(mockNaat, { customMessage });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage,
        }),
        expect.any(Object)
      );
    });

    it("should return false when share is dismissed", async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.dismissedAction,
      });

      const result = await shareService.shareNaat(mockNaat);

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      (Share.share as jest.Mock).mockRejectedValue(new Error("Share failed"));

      const result = await shareService.shareNaat(mockNaat);

      expect(result).toBe(false);
    });
  });

  describe("shareCurrentAudio", () => {
    it("should share current audio with title and channel", async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      const result = await shareService.shareCurrentAudio(
        "Current Naat",
        "Current Channel",
        "current-youtube-id"
      );

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Currently listening to: Current Naat"),
          title: "Current Naat",
        }),
        expect.any(Object)
      );
      expect(result).toBe(true);
    });

    it("should work without YouTube ID", async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      const result = await shareService.shareCurrentAudio(
        "Current Naat",
        "Current Channel"
      );

      expect(Share.share).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
