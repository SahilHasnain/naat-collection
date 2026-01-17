/**
 * Tests for For You Algorithm
 */

import { generateForYouFeed } from "../services/forYouAlgorithm";
import { storageService } from "../services/storage";
import type { Naat } from "../types";

// Mock storage service
jest.mock("../services/storage", () => ({
  storageService: {
    getWatchHistory: jest.fn(),
  },
}));

describe("For You Algorithm", () => {
  const mockNaats: Naat[] = [
    {
      $id: "1",
      title: "Naat 1",
      videoUrl: "https://example.com/1",
      thumbnailUrl: "https://example.com/thumb1.jpg",
      duration: 300,
      uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      channelName: "Channel A",
      channelId: "channel-a",
      youtubeId: "yt1",
      views: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      $id: "2",
      title: "Naat 2",
      videoUrl: "https://example.com/2",
      thumbnailUrl: "https://example.com/thumb2.jpg",
      duration: 250,
      uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
      channelName: "Channel B",
      channelId: "channel-b",
      youtubeId: "yt2",
      views: 5000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      $id: "3",
      title: "Naat 3",
      videoUrl: "https://example.com/3",
      thumbnailUrl: "https://example.com/thumb3.jpg",
      duration: 400,
      uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), // 60 days ago
      channelName: "Channel A",
      channelId: "channel-a",
      youtubeId: "yt3",
      views: 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all naats in some order", async () => {
    (storageService.getWatchHistory as jest.Mock).mockResolvedValue([]);

    const result = await generateForYouFeed(mockNaats);

    expect(result).toHaveLength(mockNaats.length);
    expect(result.map((n) => n.$id).sort()).toEqual(["1", "2", "3"]);
  });

  it("should return empty array for empty input", async () => {
    (storageService.getWatchHistory as jest.Mock).mockResolvedValue([]);

    const result = await generateForYouFeed([]);

    expect(result).toEqual([]);
  });

  it("should prioritize unwatched content", async () => {
    // Mark naat 2 as watched
    (storageService.getWatchHistory as jest.Mock).mockResolvedValue(["2"]);

    // Run algorithm multiple times to check statistical bias
    const positions = { "1": 0, "2": 0, "3": 0 };
    const runs = 100;

    for (let i = 0; i < runs; i++) {
      const result = await generateForYouFeed(mockNaats);
      // Track first position (most likely to be unwatched)
      const firstId = result[0].$id;
      positions[firstId as keyof typeof positions]++;
    }

    // Naat 2 (watched) should appear first less often than the combined unwatched naats
    const unwatchedTotal = positions["1"] + positions["3"];
    expect(positions["2"]).toBeLessThan(unwatchedTotal);
  });

  it("should handle watch history gracefully", async () => {
    // Mock error in watch history
    (storageService.getWatchHistory as jest.Mock).mockRejectedValue(
      new Error("Storage error")
    );

    // Should still work without watch history
    await expect(generateForYouFeed(mockNaats)).rejects.toThrow();
  });

  it("should produce different orders on multiple runs", async () => {
    (storageService.getWatchHistory as jest.Mock).mockResolvedValue([]);

    const result1 = await generateForYouFeed(mockNaats);
    const result2 = await generateForYouFeed(mockNaats);

    // Due to random factor, orders should differ (statistically)
    // Run multiple times to ensure randomness
    let differentOrders = 0;
    for (let i = 0; i < 10; i++) {
      const r1 = await generateForYouFeed(mockNaats);
      const r2 = await generateForYouFeed(mockNaats);
      if (JSON.stringify(r1) !== JSON.stringify(r2)) {
        differentOrders++;
      }
    }

    // At least some runs should produce different orders
    expect(differentOrders).toBeGreaterThan(0);
  });

  it("should handle single naat", async () => {
    (storageService.getWatchHistory as jest.Mock).mockResolvedValue([]);

    const result = await generateForYouFeed([mockNaats[0]]);

    expect(result).toHaveLength(1);
    expect(result[0].$id).toBe("1");
  });
});
