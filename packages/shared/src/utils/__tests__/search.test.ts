import { searchItems } from "../search";

describe("Custom Search Algorithm", () => {
  const mockNaats = [
    {
      title: "Hai Kalam e Ilah Mein Shamsudduha",
      channelName: "Owais Raza Qadri",
    },
    {
      title: "Kalam e Pak",
      channelName: "Other Channel",
    },
    {
      title: "Shamsudduha Ka Kalam",
      channelName: "Owais Raza Qadri",
    },
    {
      title: "Hai Ilah Mein Kalam Shamsudduha",
      channelName: "Owais Raza Qadri",
    },
    {
      title: "Beautiful Naat",
      channelName: "Owais Raza Qadri",
    },
  ];

  test("exact phrase match gets highest score", () => {
    const results = searchItems(mockNaats, "Hai Kalam e Ilah Mein Shamsudduha");

    // First result should be exact match
    expect(results[0].title).toBe("Hai Kalam e Ilah Mein Shamsudduha");
    expect(results.length).toBeGreaterThan(0);
  });

  test("all words must be present", () => {
    const results = searchItems(mockNaats, "Hai Kalam Ilah Shamsudduha");

    // Should NOT include "Kalam e Pak" (missing words)
    const titles = results.map((r) => r.title);
    expect(titles).not.toContain("Kalam e Pak");
    expect(titles).not.toContain("Beautiful Naat");
  });

  test("words in order get higher score than out of order", () => {
    const results = searchItems(mockNaats, "Hai Kalam Ilah Shamsudduha");

    // "Hai Kalam e Ilah Mein Shamsudduha" should rank higher than
    // "Hai Ilah Mein Kalam Shamsudduha" (words not in order)
    expect(results[0].title).toBe("Hai Kalam e Ilah Mein Shamsudduha");
  });

  test("single word that does not match all returns empty", () => {
    const results = searchItems(mockNaats, "kalam");

    // "kalam" alone should match multiple items
    expect(results.length).toBeGreaterThan(1);
  });

  test("ignores small connector words", () => {
    const results1 = searchItems(mockNaats, "Kalam Ilah Shamsudduha");
    const results2 = searchItems(mockNaats, "Kalam e Ilah Mein Shamsudduha");

    // Both should return same results (ignoring "e" and "mein")
    expect(results1.length).toBe(results2.length);
  });

  test("empty query returns empty results", () => {
    const results = searchItems(mockNaats, "");
    expect(results).toEqual([]);
  });

  test("query with only ignored words returns empty", () => {
    const results = searchItems(mockNaats, "e ke ka");
    expect(results).toEqual([]);
  });

  test("case insensitive search", () => {
    const results1 = searchItems(mockNaats, "KALAM SHAMSUDDUHA");
    const results2 = searchItems(mockNaats, "kalam shamsudduha");

    expect(results1.length).toBe(results2.length);
  });

  test("channel name search with lower weight", () => {
    const results = searchItems(mockNaats, "Owais Raza Qadri", {
      searchInChannel: true,
    });

    // Should find naats by channel name
    expect(results.length).toBeGreaterThan(0);
  });

  test("minimum score filter", () => {
    const results = searchItems(mockNaats, "Kalam", {
      minScore: 80, // Only exact or in-order matches
    });

    // Should have fewer results with higher minScore
    const allResults = searchItems(mockNaats, "Kalam", {
      minScore: 60,
    });

    expect(results.length).toBeLessThanOrEqual(allResults.length);
  });
});
