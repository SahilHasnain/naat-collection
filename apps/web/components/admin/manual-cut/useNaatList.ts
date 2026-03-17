"use client";

import { Client, Databases, Query } from "appwrite";
import { useEffect, useState } from "react";
import { Naat, SortBy, FilterRadio, FilterDuration, FilterProcessed } from "./types";

const LIMIT = 50;

function createDbClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
  return new Databases(client);
}

export function useNaatList(selectedNaatId: string | null) {
  const [naats, setNaats] = useState<Naat[]>([]);
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
  const [filterRadio, setFilterRadio] = useState<FilterRadio>("radio");
  const [filterDuration, setFilterDuration] = useState<FilterDuration>("<=10min");
  const [filterProcessed, setFilterProcessed] = useState<FilterProcessed>("unprocessed");
  const [sortBy, setSortBy] = useState<SortBy>("popular");
  const [randomSeed, setRandomSeed] = useState(0);

  const [updatingExclude, setUpdatingExclude] = useState<string | null>(null);
  const [updatingRadio, setUpdatingRadio] = useState<string | null>(null);
  const [playingNaatId, setPlayingNaatId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

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
    if (selectedNaatId) return;
    setNaats([]);
    setOffset(0);
    setHasMore(true);
    loadNaats(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, filterRadio, filterChannel, filterDuration, filterProcessed, searchQuery, randomSeed, selectedNaatId]);

  async function loadInitialData() {
    try {
      const db = createDbClient();
      const res = await db.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        [Query.select(["channelName"]), Query.limit(5000)],
      );
      const unique = Array.from(
        new Set(res.documents.map((d: any) => d.channelName).filter(Boolean)),
      ).sort() as string[];
      setChannels(unique);
      await loadNaats(0, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setLoading(false);
    }
  }

  async function loadNaats(currentOffset: number = offset, isInitial = false) {
    isInitial ? setLoading(true) : setLoadingMore(true);
    setError(null);
    try {
      const db = createDbClient();
      const queries: string[] = [
        Query.limit(LIMIT),
        Query.offset(currentOffset),
        Query.isNotNull("audioId"),
      ];

      if (filterProcessed === "unprocessed") queries.push(Query.isNull("cutSegments"));
      else if (filterProcessed === "processed") queries.push(Query.isNotNull("cutSegments"));

      if (sortBy === "latest") queries.push(Query.orderDesc("uploadDate"));
      else if (sortBy === "oldest") queries.push(Query.orderAsc("uploadDate"));
      else if (sortBy === "popular") queries.push(Query.orderDesc("views"));
      else if (sortBy === "random") queries.push(Query.orderRandom());

      if (filterRadio === "radio") queries.push(Query.equal("radio", true));
      else if (filterRadio === "non-radio")
        queries.push(Query.or([Query.equal("radio", false), Query.isNull("radio")]));

      if (filterChannel !== "all") queries.push(Query.equal("channelName", filterChannel));

      if (filterDuration === "<=10min") queries.push(Query.lessThanEqual("duration", 600));
      else if (filterDuration === ">15min") queries.push(Query.greaterThan("duration", 900));
      else if (filterDuration === ">20min") queries.push(Query.greaterThan("duration", 1200));

      if (searchQuery.trim()) queries.push(Query.search("title", searchQuery.trim()));

      const res = await db.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        queries,
      );

      const newNaats = res.documents as unknown as Naat[];
      setNaats((prev) => (isInitial || currentOffset === 0 ? newNaats : [...prev, ...newNaats]));
      setTotalCount(res.total);
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

  async function togglePlayAudio(naat: Naat) {
    if (!audioElement || !naat.audioId) return;
    if (playingNaatId === naat.$id) {
      audioElement.paused ? audioElement.play() : audioElement.pause();
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
    naats, setNaats, loading, loadingMore, error, setError,
    hasMore, setHasMore, offset, setOffset, totalCount, channels,
    searchTerm, setSearchTerm, searchQuery, setSearchQuery,
    filterChannel, setFilterChannel,
    filterRadio, setFilterRadio,
    filterDuration, setFilterDuration,
    filterProcessed, setFilterProcessed,
    sortBy, setSortBy,
    loadMore, shuffleResults, handleSearchSubmit, loadNaats,
    updatingExclude, updatingRadio, toggleExclude, toggleRadio,
    playingNaatId, audioElement, togglePlayAudio,
  };
}
