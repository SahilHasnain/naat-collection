/**
 * Tests for related-video ranking.
 *
 * The key invariant: every channel in a brand belongs to the same artist, so
 * channel signals must never influence the related list.
 */

import type { Naat } from "@naat-collection/shared";
import type { UserProfile } from "../services/userProfile";
import {
  dedupeRelatedNaats,
  rankRelatedNaats,
  titleSimilarity,
  tokenizeTitle,
} from "../utils/relatedScoring";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

function makeNaat(
  overrides: Partial<Naat> & { $id: string; title: string },
): Naat {
  return {
    videoUrl: "",
    thumbnailUrl: "",
    duration: 300,
    uploadDate: new Date().toISOString(),
    channelName: "Owais Raza Qadri",
    channelId: "channel-a",
    youtubeId: "yt",
    views: 1000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Naat;
}

const PROFILE: UserProfile = {
  channelAffinity: {},
  dislikedNaats: {},
  dislikedChannels: {},
  topicTerms: {},
  durationCounts: { short: 0, medium: 0, long: 0 },
  totalPlays: 0,
  lastUpdated: 0,
};

describe("tokenizeTitle", () => {
  it("drops genre words and upload noise", () => {
    expect(tokenizeTitle("New Naat 2024 Official Video HD")).toEqual(["2024"]);
  });

  it("keeps meaningful roman-urdu topic words", () => {
    expect(tokenizeTitle("Ya Nabi Salam Alaika - Naat")).toEqual([
      "nabi",
      "alaika",
    ]);
  });
});

describe("titleSimilarity", () => {
  it("scores matching topics above unrelated ones", () => {
    const related = titleSimilarity(
      "Ya Nabi Salam Alaika",
      "Salam Alaika Ya Nabi",
    );
    const unrelated = titleSimilarity(
      "Ya Nabi Salam Alaika",
      "Mera Dil Bole Pakistan",
    );
    expect(related).toBeGreaterThan(unrelated);
  });

  it("returns 0 when either title has no meaningful tokens", () => {
    expect(titleSimilarity("Official Video", "Mera Dil Bole Pakistan")).toBe(0);
  });
});

describe("rankRelatedNaats", () => {
  const current = makeNaat({ $id: "current", title: "Ya Nabi Salam Alaika" });

  it("excludes the current naat and disliked naats", () => {
    const candidates = [
      current,
      makeNaat({ $id: "disliked", title: "Khuda Ke Liye" }),
      makeNaat({ $id: "ok", title: "Mustafa Jaan E Rehmat" }),
    ];

    const result = rankRelatedNaats({
      currentId: current.$id,
      currentTitle: current.title,
      candidates,
      profile: { ...PROFILE, dislikedNaats: { disliked: 2 } },
      watchTimestamps: {},
    });

    expect(result.map((naat) => naat.$id)).toEqual(["ok"]);
  });

  it("collapses reuploads of the same title, keeping the most viewed copy", () => {
    const candidates = [
      makeNaat({ $id: "low-views", title: "Mustafa Jaan E Rehmat", views: 10 }),
      makeNaat({
        $id: "high-views",
        title: "Mustafa Jaan E Rehmat",
        views: 9999,
      }),
    ];

    const result = rankRelatedNaats({
      currentId: current.$id,
      currentTitle: current.title,
      candidates,
      profile: PROFILE,
      watchTimestamps: {},
    });

    expect(result).toHaveLength(1);
    expect(result[0].$id).toBe("high-views");
  });

  it("drops a reupload of the current title under a different id", () => {
    const candidates = [
      makeNaat({
        $id: "reupload",
        title: "Ya Nabi Salam Alaika (Official Video)",
      }),
      makeNaat({ $id: "other", title: "Mera Dil Bole Pakistan" }),
    ];

    const result = rankRelatedNaats({
      currentId: current.$id,
      currentTitle: current.title,
      candidates,
      profile: PROFILE,
      watchTimestamps: {},
    });

    expect(result.map((naat) => naat.$id)).toEqual(["other"]);
  });

  it("ranks topical matches first", () => {
    const candidates = [
      makeNaat({
        $id: "unrelated",
        title: "Mera Dil Bole Pakistan",
        views: 5000,
      }),
      // Shares the "nabi" topic with the current title without being the same
      // content, so it survives dedupe and wins on relevance.
      makeNaat({ $id: "topical", title: "Nabi Ki Shan", views: 100 }),
    ];

    const result = rankRelatedNaats({
      currentId: current.$id,
      currentTitle: current.title,
      candidates,
      profile: PROFILE,
      watchTimestamps: {},
      limit: 2,
    });

    expect(result[0].$id).toBe("topical");
  });

  it("ignores channel affinity entirely", () => {
    const candidates = [
      makeNaat({
        $id: "a",
        title: "Mustafa Jaan E Rehmat",
        channelId: "channel-a",
      }),
      makeNaat({
        $id: "b",
        title: "Mera Dil Bole Pakistan",
        channelId: "channel-b",
      }),
      makeNaat({
        $id: "c",
        title: "Aaqa Ki Aamad Hai",
        channelId: "channel-c",
      }),
    ];

    const base = rankRelatedNaats({
      currentId: current.$id,
      currentTitle: current.title,
      candidates,
      profile: PROFILE,
      watchTimestamps: {},
    });

    const biased = rankRelatedNaats({
      currentId: current.$id,
      currentTitle: current.title,
      candidates,
      profile: {
        ...PROFILE,
        channelAffinity: { "channel-c": 50, "channel-b": 0, "channel-a": -10 },
        dislikedChannels: { "channel-b": 3 },
      },
      watchTimestamps: {},
    });

    expect(biased.map((naat) => naat.$id)).toEqual(
      base.map((naat) => naat.$id),
    );
  });

  it("still returns a personalized popular fallback for generic titles", () => {
    const candidates = [
      makeNaat({ $id: "popular", title: "Official Video", views: 100000 }),
      makeNaat({ $id: "rare", title: "Full Naat", views: 5 }),
    ];

    const result = rankRelatedNaats({
      currentId: current.$id,
      currentTitle: "Official Video",
      candidates,
      profile: PROFILE,
      watchTimestamps: {},
      limit: 2,
    });

    // Generic titles all tokenize away; popularity still separates them and
    // nothing is dropped.
    expect(result.map((naat) => naat.$id)).toEqual(["popular", "rare"]);
  });
});

describe("dedupeRelatedNaats", () => {
  it("dedupes IDs and title reuploads while preserving page order", () => {
    const first = makeNaat({ $id: "first", title: "Ya Nabi" });
    const duplicateId = makeNaat({ $id: "first", title: "Different title" });
    const duplicateTitle = makeNaat({
      $id: "second",
      title: "Ya Nabi (Official Video)",
    });
    const third = makeNaat({ $id: "third", title: "Mera Madina" });

    expect(
      dedupeRelatedNaats([first, duplicateId, duplicateTitle, third]).map(
        (n) => n.$id,
      ),
    ).toEqual(["first", "third"]);
  });
});
