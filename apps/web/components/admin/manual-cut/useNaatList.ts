"use client";

import { Client, Databases, Query } from "appwrite";
import { useEffect, useRef, useState } from "react";
import { Naat, SortBy, FilterRadio, FilterExclude, FilterDuration, FilterProcessed, FilterAiCut } from "./types";

const LIMIT = 50;
const SEARCH_LIMIT = 1000;

const IGNORE_WORDS = new Set([
  "e", "ke", "ka", "ki", "ko", "se", "me", "mein", "par", "pe",
  "aur", "ya", "hai", "hain", "tha", "the", "thi", "ho", "he",
  "a", "an", "and", "of", "in", "on", "at", "to", "for",
]);

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractWords(text: string) {
  return normalizeText(text)
    .split(" ")
    .filter((word) => word.length >= 2 && !IGNORE_WORDS.has(word));
}

function levenshtein(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[a.length][b.length];
}

function fuzzyWordScore(queryWord: string, targetWords: string[]) {
  let bestScore = 0;

  for (const targetWord of targetWords) {
    if (targetWord === queryWord) return 1;
    if (targetWord.includes(queryWord) || queryWord.includes(targetWord)) {
      bestScore = Math.max(bestScore, 0.88);
      continue;
    }

    const distance = levenshtein(queryWord, targetWord);
    const maxLength = Math.max(queryWord.length, targetWord.length);
    const similarity = maxLength === 0 ? 0 : 1 - distance / maxLength;

    if (
      (maxLength >= 4 && distance <= 1) ||
      (maxLength >= 6 && distance <= 2)
    ) {
      bestScore = Math.max(bestScore, similarity);
    }
  }

  return bestScore;
}

function scoreNaatForFuzzySearch(naat: Naat, query: string) {
  const normalizedQuery = normalizeText(query);
  const title = normalizeText(naat.title || "");
  const channel = normalizeText(naat.channelName || "");
  const youtubeId = normalizeText(naat.youtubeId || "");

  if (!normalizedQuery) return 0;
  if (youtubeId === normalizedQuery) return 220;
  if (youtubeId.includes(normalizedQuery)) return 180;
  if (title.includes(normalizedQuery)) return 160;
  if (channel.includes(normalizedQuery)) return 110;

  const queryWords = extractWords(query);
  if (queryWords.length === 0) return 0;

  const titleWords = extractWords(naat.title || "");
  const channelWords = extractWords(naat.channelName || "");
  const combinedWords = [...titleWords, ...channelWords];

  if (combinedWords.length === 0) return 0;

  let total = 0;
  let strongMatches = 0;

  for (const queryWord of queryWords) {
    const score = fuzzyWordScore(queryWord, combinedWords);
    if (score < 0.68) return 0;
    if (score >= 0.88) strongMatches += 1;
    total += score;
  }

  return total * 100 + strongMatches * 8;
}

function createDbClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
  return new Databases(client);
}

export function useNaatList(selectedNaatId: string | null) {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [aiJobStatuses, setAiJobStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [channels, setChannels] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterRadio, setFilterRadio] = useState<FilterRadio>("all");
  const [filterExclude, setFilterExclude] = useState<FilterExclude>("included");
  const [filterDuration, setFilterDuration] = useState<FilterDuration>("all");
  const [filterProcessed, setFilterProcessed] = useState<FilterProcessed>("all");
  const [filterAiCut, setFilterAiCut] = useState<FilterAiCut>("all");
  const [sortBy, setSortBy] = useState<SortBy>("popular");
  const [randomSeed, setRandomSeed] = useState(0);

  const [updatingExclude, setUpdatingExclude] = useState<string | null>(null);
  const [updatingRadio, setUpdatingRadio] = useState<string | null>(null);
  const [updatingAiTrain, setUpdatingAiTrain] = useState<string | null>(null);
  const [playingNaatId, setPlayingNaatId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [initialized, setInitialized] = useState(false);
  const hasAppliedPostInitFilters = useRef(false);

  useEffect(() => {
    const audio = new Audio();
    audio.addEventListener("ended", () => setPlayingNaatId(null));
    audio.addEventListener("error", () => setPlayingNaatId(null));
    setAudioElement(audio);
    loadInitialData();
    return () => {
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialized || selectedNaatId) return;
    if (!hasAppliedPostInitFilters.current) {
      hasAppliedPostInitFilters.current = true;
      return;
    }
    setNaats([]);
    setOffset(0);
    setHasMore(true);
    loadNaats(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, sortBy, filterRadio, filterExclude, filterChannel, filterDuration, filterProcessed, filterAiCut, searchQuery, randomSeed, selectedNaatId]);

  async function loadInitialData() {
    try {
      const db = createDbClient();
      const channelResponse = await db.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        [Query.select(["channelName"]), Query.limit(5000)],
      );
      const unique = Array.from(
        new Set(
          channelResponse.documents
            .map((d) => ("channelName" in d ? d.channelName : undefined))
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      ).sort();
      setChannels(unique);
      await loadNaats(0, true);
      setInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setLoading(false);
    }
  }

  async function loadAiJobStatuses(naatIds: string[]) {
    if (naatIds.length === 0) {
      setAiJobStatuses({});
      return;
    }

    try {
      const params = new URLSearchParams({ naatIds: naatIds.join(",") });
      const res = await fetch(`/api/admin/ai-job-statuses?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load AI job statuses");
      const data = await res.json();
      setAiJobStatuses(data.statuses || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI job statuses");
    }
  }

  async function loadNaats(currentOffset: number = offset, isInitial = false) {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const db = createDbClient();
      const hasFuzzySearch = searchQuery.trim().length > 0;
      const queries: string[] = [
        Query.limit(hasFuzzySearch ? SEARCH_LIMIT : LIMIT),
        Query.offset(hasFuzzySearch ? 0 : currentOffset),
        Query.isNotNull("audioId"),
      ];

      if (filterProcessed === "unprocessed") queries.push(Query.isNull("cutSegments"));
      else if (filterProcessed === "processed") queries.push(Query.isNotNull("cutSegments"));

      if (filterAiCut === "ai-cut") queries.push(Query.equal("isAiCut", true));
      else if (filterAiCut === "non-ai-cut")
        queries.push(Query.or([Query.equal("isAiCut", false), Query.isNull("isAiCut")]));

      if (sortBy === "latest") queries.push(Query.orderDesc("uploadDate"));
      else if (sortBy === "oldest") queries.push(Query.orderAsc("uploadDate"));
      else if (sortBy === "popular") queries.push(Query.orderDesc("views"));
      else if (sortBy === "random") queries.push(Query.orderRandom());

      if (filterRadio === "radio") queries.push(Query.equal("radio", true));
      else if (filterRadio === "non-radio")
        queries.push(Query.or([Query.equal("radio", false), Query.isNull("radio")]));

      if (filterExclude === "excluded") queries.push(Query.equal("exclude", true));
      else if (filterExclude === "included")
        queries.push(Query.or([Query.equal("exclude", false), Query.isNull("exclude")]));

      if (filterChannel !== "all") queries.push(Query.equal("channelName", filterChannel));

      if (filterDuration === "<=10min") queries.push(Query.lessThanEqual("duration", 600));
      else if (filterDuration === ">15min") queries.push(Query.greaterThan("duration", 900));
      else if (filterDuration === ">20min") queries.push(Query.greaterThan("duration", 1200));

      const res = await db.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        queries,
      );

      let fetchedNaats = res.documents as unknown as Naat[];
      let total = res.total;

      if (hasFuzzySearch) {
        const ranked = fetchedNaats
          .map((naat) => ({
            naat,
            score: scoreNaatForFuzzySearch(naat, searchQuery),
          }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((entry) => entry.naat);

        total = ranked.length;
        fetchedNaats = ranked.slice(currentOffset, currentOffset + LIMIT);
      }

      const newNaats = fetchedNaats;
      const nextNaats =
        isInitial || currentOffset === 0 ? newNaats : [...naats, ...newNaats];
      await loadAiJobStatuses(nextNaats.map((naat) => naat.$id));
      setNaats(nextNaats);
      setTotalCount(total);
      setHasMore(newNaats.length === LIMIT);
      setOffset(currentOffset + newNaats.length);
      return newNaats;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load naats");
      return [];
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    if (!loadingMore && hasMore) loadNaats(offset);
  }

  function shuffleResults() {
    setRandomSeed((prev) => prev + 1);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchTerm);
  }

  async function toggleExclude(naatId: string, current: boolean) {
    setUpdatingExclude(naatId);
    try {
      const res = await fetch("/api/admin/toggle-exclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naatId, exclude: !current }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNaats((prev) => prev.map((n) => n.$id === naatId ? { ...n, exclude: !current } : n));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update naat");
    } finally {
      setUpdatingExclude(null);
    }
  }

  async function toggleRadio(naatId: string, current: boolean) {
    setUpdatingRadio(naatId);
    try {
      const res = await fetch("/api/admin/toggle-radio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naatId, radio: !current }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNaats((prev) => prev.map((n) => n.$id === naatId ? { ...n, radio: !current } : n));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update naat");
    } finally {
      setUpdatingRadio(null);
    }
  }

  async function toggleAiTrain(naatId: string, current: boolean) {
    setUpdatingAiTrain(naatId);
    try {
      const res = await fetch("/api/admin/toggle-ai-train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naatId, aiTrain: !current }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNaats((prev) => prev.map((n) => n.$id === naatId ? { ...n, aiTrain: !current } : n));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update naat");
    } finally {
      setUpdatingAiTrain(null);
    }
  }

  async function togglePlayAudio(naat: Naat) {
    if (!audioElement || !naat.audioId) return;
    if (playingNaatId === naat.$id) {
      if (audioElement.paused) audioElement.play();
      else audioElement.pause();
      if (!audioElement.paused) setPlayingNaatId(null);
      return;
    }
    audioElement.pause();
    setPlayingNaatId(naat.$id);
    try {
      audioElement.src = `/api/stream-audio?audioId=${naat.audioId}`;
      await audioElement.play();
    } catch {
      setPlayingNaatId(null);
    }
  }

  return {
    naats, setNaats, loading, loadingMore, error, setError, aiJobStatuses, loadAiJobStatuses,
    hasMore, setHasMore, offset, setOffset, totalCount, channels,
    searchTerm, setSearchTerm, searchQuery, setSearchQuery,
    filterChannel, setFilterChannel,
    filterRadio, setFilterRadio,
    filterExclude, setFilterExclude,
    filterDuration, setFilterDuration,
    filterProcessed, setFilterProcessed,
    filterAiCut, setFilterAiCut,
    sortBy, setSortBy,
    loadMore, shuffleResults, handleSearchSubmit, loadNaats,
    updatingExclude, updatingRadio, updatingAiTrain, toggleExclude, toggleRadio, toggleAiTrain,
    playingNaatId, audioElement, togglePlayAudio,
  };
}
