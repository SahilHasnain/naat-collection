"use client";

import { Client, Databases, Query } from "appwrite";
import { useEffect, useState } from "react";

interface Naat {
  $id: string;
  title: string;
  youtubeId: string;
  audioId: string;
  duration?: number;
  channelName?: string;
  views?: number;
  uploadDate?: string;
  radio?: boolean;
}

interface CutSegment {
  start: number;
  end: number;
}

interface DetectionResult {
  duration: number;
  speechSegments: {
    start: number;
    end: number;
    confidence: number;
    duration: number;
  }[];
  allSegments: {
    start: number;
    end: number;
    type: string;
    confidence: number;
  }[];
  totalSpeechDuration: number;
  totalSingingDuration: number;
}

export default function ManualCutClient() {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [selectedNaat, setSelectedNaat] = useState<Naat | null>(null);
  const [cutSegments, setCutSegments] = useState<CutSegment[]>([
    { start: 0, end: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterRadio, setFilterRadio] = useState<"all" | "radio" | "non-radio">(
    "all",
  );
  const [filterDuration, setFilterDuration] = useState<
    "all" | "<=10min" | ">15min" | ">20min"
  >("all");
  const [sortBy, setSortBy] = useState<"latest" | "popular" | "oldest">(
    "latest",
  );
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [channels, setChannels] = useState<string[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [originalAudioRef, setOriginalAudioRef] =
    useState<HTMLAudioElement | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] =
    useState<DetectionResult | null>(null);

  const LIMIT = 50;

  const seekAudio = (audioRef: HTMLAudioElement | null, seconds: number) => {
    if (audioRef) {
      audioRef.currentTime = Math.max(
        0,
        Math.min(audioRef.currentTime + seconds, audioRef.duration || 0),
      );
    }
  };

  // Save state to localStorage
  const saveState = () => {
    if (selectedNaat) {
      localStorage.setItem(
        "adminCutState",
        JSON.stringify({
          naatId: selectedNaat.$id,
          segments: cutSegments,
        }),
      );
    }
  };

  // Clear state from localStorage
  const clearState = () => {
    localStorage.removeItem("adminCutState");
  };

  useEffect(() => {
    loadInitialData();

    // Add scroll listener for back to top button
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Reset and reload when filters change
    if (!selectedNaat) {
      setNaats([]);
      setOffset(0);
      setHasMore(true);
      loadNaats(0, true);
    }
  }, [
    sortBy,
    filterRadio,
    filterChannel,
    filterDuration,
    searchQuery,
    selectedNaat,
  ]);

  useEffect(() => {
    // Restore pending cut after naats are loaded — no longer needed
  }, [naats]);

  useEffect(() => {
    // Auto-save cut segments and selected naat
    if (selectedNaat) {
      localStorage.setItem(
        "cutSegmentsDraft",
        JSON.stringify({
          naatId: selectedNaat.$id,
          segments: cutSegments,
        }),
      );
    }
  }, [selectedNaat, cutSegments]);

  useEffect(() => {
    // Restore draft segments when naat is selected
    if (!selectedNaat) return;

    const savedDraft = localStorage.getItem("cutSegmentsDraft");
    if (savedDraft) {
      try {
        const { naatId, segments } = JSON.parse(savedDraft);
        if (naatId === selectedNaat.$id && segments && segments.length > 0) {
          // Only restore if current segments are default
          if (
            cutSegments.length === 1 &&
            cutSegments[0].start === 0 &&
            cutSegments[0].end === 0
          ) {
            setCutSegments(segments);
          }
        }
      } catch (err) {
        console.error("Failed to restore draft:", err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNaat]);

  async function loadInitialData() {
    try {
      const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

      const databases = new Databases(client);

      // Load channels list
      const channelsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        [Query.select(["channelName"]), Query.limit(5000)],
      );

      const uniqueChannels = Array.from(
        new Set(
          channelsResponse.documents
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((doc: any) => doc.channelName)
            .filter(Boolean),
        ),
      ).sort() as string[];

      setChannels(uniqueChannels);

      // Load first page of naats
      await loadNaats(0, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setLoading(false);
    }
  }

  async function loadNaats(
    currentOffset: number = offset,
    isInitial: boolean = false,
  ) {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

      const databases = new Databases(client);

      // Build queries based on filters
      const queries: string[] = [
        Query.limit(LIMIT),
        Query.offset(currentOffset),
        Query.isNotNull("audioId"),
        Query.isNull("cutSegments"),
        Query.or([Query.equal("exclude", false), Query.isNull("exclude")]),
      ];

      // Sort query
      if (sortBy === "latest") {
        queries.push(Query.orderDesc("uploadDate"));
      } else if (sortBy === "oldest") {
        queries.push(Query.orderAsc("uploadDate"));
      } else if (sortBy === "popular") {
        queries.push(Query.orderDesc("views"));
      }

      // Filter by radio status
      if (filterRadio === "radio") {
        queries.push(Query.equal("radio", true));
      } else if (filterRadio === "non-radio") {
        queries.push(
          Query.or([Query.equal("radio", false), Query.isNull("radio")]),
        );
      }

      // Filter by channel
      if (filterChannel !== "all") {
        queries.push(Query.equal("channelName", filterChannel));
      }

      // Filter by duration
      if (filterDuration === "<=10min") {
        queries.push(Query.lessThanEqual("duration", 600)); // 10 minutes = 600 seconds
      } else if (filterDuration === ">15min") {
        queries.push(Query.greaterThan("duration", 900)); // 15 minutes = 900 seconds
      } else if (filterDuration === ">20min") {
        queries.push(Query.greaterThan("duration", 1200)); // 20 minutes = 1200 seconds
      }

      // Search query
      if (searchQuery.trim()) {
        queries.push(Query.search("title", searchQuery.trim()));
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        queries,
      );

      const newNaats = response.documents as unknown as Naat[];

      if (isInitial || currentOffset === 0) {
        setNaats(newNaats);
      } else {
        setNaats((prev) => [...prev, ...newNaats]);
      }

      setTotalCount(response.total);
      setHasMore(newNaats.length === LIMIT);
      setOffset(currentOffset + newNaats.length);

      // Restore saved state only on initial load
      if (isInitial) {
        const saved = localStorage.getItem("adminCutState");
        if (saved) {
          try {
            const { naatId, segments } = JSON.parse(saved);
            const naat = newNaats.find((n) => n.$id === naatId);
            if (naat) {
              setSelectedNaat(naat);
              if (segments?.length > 0) setCutSegments(segments);
            }
          } catch (err) {
            console.error("Failed to restore:", err);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load naats");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    if (!loadingMore && hasMore) {
      loadNaats(offset);
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchTerm);
  }

  function addSegment() {
    setCutSegments([...cutSegments, { start: 0, end: 0 }]);
  }

  function removeSegment(index: number) {
    setCutSegments(cutSegments.filter((_, i) => i !== index));
  }

  function updateSegmentTime(
    index: number,
    field: "start" | "end",
    minutes: number,
    seconds: number,
  ) {
    const newSegments = [...cutSegments];
    newSegments[index][field] = minutes * 60 + seconds;
    setCutSegments(newSegments);
    saveState();
  }

  function getMinutes(seconds: number): number {
    return Math.floor(seconds / 60);
  }

  function getSeconds(totalSeconds: number): number {
    return Math.floor(totalSeconds % 60);
  }

  async function handleSaveTimestamps() {
    if (!selectedNaat) return;

    const validSegments = cutSegments.filter((seg) => seg.start < seg.end);
    if (validSegments.length === 0) {
      setError("Add at least one valid segment (start must be less than end)");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/save-timestamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naatId: selectedNaat.$id,
          cutSegments: validSegments,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save timestamps");
      }

      alert("Timestamps saved!");

      clearState();

      setSelectedNaat(null);
      setCutSegments([{ start: 0, end: 0 }]);
      setDetectionResult(null);
      // Reload the list
      setNaats([]);
      setOffset(0);
      setHasMore(true);
      loadNaats(0, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save timestamps");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkipNoExplanation() {
    if (!selectedNaat) return;

    const confirmed = confirm(
      `Mark "${selectedNaat.title}" as having no explanation parts?\n\nThis will use the original audio as the final version.`,
    );

    if (!confirmed) return;

    setSkipping(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/skip-no-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naatId: selectedNaat.$id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to skip naat");
      }

      alert("Naat marked as having no explanation parts!");

      clearState();

      setSelectedNaat(null);
      setCutSegments([{ start: 0, end: 0 }]);
      // Reload the list
      setNaats([]);
      setOffset(0);
      setHasMore(true);
      loadNaats(0, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip naat");
    } finally {
      setSkipping(false);
    }
  }

  const getAudioUrl = (fileId: string, bucket: string = "audio-files") =>
    `/api/stream-audio?audioId=${fileId}&bucket=${bucket}`;

  async function handleDetectSegments() {
    if (!selectedNaat) return;

    setDetecting(true);
    setDetectionResult(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/detect-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naatId: selectedNaat.$id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Detection failed");
      }

      setDetectionResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setDetecting(false);
    }
  }

  function applyDetectedSegments() {
    if (!detectionResult || detectionResult.speechSegments.length === 0) return;

    const segments = detectionResult.speechSegments.map((seg) => ({
      start: Math.round(seg.start),
      end: Math.round(seg.end),
    }));

    setCutSegments(segments);
  }

  const filteredNaats = naats.filter(
    (naat) =>
      naat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      naat.youtubeId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="min-h-screen p-8 text-white bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <p>Loading naats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 text-white bg-gray-900">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-3xl font-bold">Manual Audio Cut</h1>
        <p className="mb-8 text-gray-400">
          Select a naat to edit • {naats.length} available
        </p>

        {error && (
          <div className="px-4 py-3 mb-6 text-red-200 border border-red-500 rounded bg-red-900/50">
            {error}
          </div>
        )}

        {!selectedNaat ? (
          <div>
            <div className="p-6 mb-6 bg-gray-800 rounded-lg">
              <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400">Total Matching</p>
                  <p className="text-2xl font-bold">
                    {totalCount.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 border border-blue-700 rounded-lg bg-blue-900/30">
                  <p className="text-sm text-gray-400">Loaded</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {naats.length.toLocaleString()}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearchSubmit} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by title or YouTube ID... (Press Enter)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 transition-colors bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <svg
                    className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </form>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <select
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as "latest" | "popular" | "oldest",
                      )
                    }
                  >
                    <option value="latest">Latest</option>
                    <option value="popular">Most Popular</option>
                    <option value="oldest">Oldest</option>
                  </select>
                  <select
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded"
                    value={filterChannel}
                    onChange={(e) => setFilterChannel(e.target.value)}
                  >
                    <option value="all">All Channels</option>
                    {channels.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-4 md:flex-row">
                  <select
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded"
                    value={filterRadio}
                    onChange={(e) =>
                      setFilterRadio(
                        e.target.value as "all" | "radio" | "non-radio",
                      )
                    }
                  >
                    <option value="all">All Radio Status</option>
                    <option value="radio">Radio Only</option>
                    <option value="non-radio">Non-Radio Only</option>
                  </select>
                  <select
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded"
                    value={filterDuration}
                    onChange={(e) =>
                      setFilterDuration(
                        e.target.value as
                          | "all"
                          | "<=10min"
                          | ">15min"
                          | ">20min",
                      )
                    }
                  >
                    <option value="all">All Durations</option>
                    <option value="<=10min">10 min or less</option>
                    <option value=">15min">Longer than 15 min</option>
                    <option value=">20min">Longer than 20 min</option>
                  </select>
                </div>
              </div>

              <p className="flex items-center gap-2 mt-4 text-sm text-yellow-400">
                <span>💡</span>
                <span>Click a card to start editing</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredNaats.map((naat) => (
                <button
                  key={naat.$id}
                  onClick={() => {
                    setSelectedNaat(naat);
                    setCutSegments([{ start: 0, end: 0 }]);
                    setDetectionResult(null);
                  }}
                  className="p-4 text-left transition-all duration-200 bg-gray-800 border-2 border-gray-700 rounded-lg shadow-lg hover:bg-gray-750 hover:border-blue-500 group hover:shadow-blue-500/20"
                >
                  <div className="relative mb-3 overflow-hidden bg-gray-700 rounded-lg aspect-video">
                    <img
                      src={`https://img.youtube.com/vi/${naat.youtubeId}/mqdefault.jpg`}
                      alt={naat.title}
                      className="object-cover w-full h-full transition-transform group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = `https://img.youtube.com/vi/${naat.youtubeId}/default.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute px-2 py-1 text-xs rounded bottom-2 right-2 bg-black/80">
                      {naat.duration
                        ? `${Math.floor(naat.duration / 60)}:${String(Math.floor(naat.duration % 60)).padStart(2, "0")}`
                        : "N/A"}
                    </div>
                    {naat.radio && (
                      <div className="absolute px-2 py-1 bg-green-600 rounded top-2 right-2">
                        <span className="text-xs font-bold text-white">
                          📻 RADIO
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="mb-2 font-semibold text-white transition-colors group-hover:text-blue-400 line-clamp-2">
                    {naat.title}
                  </h3>
                  {naat.channelName && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                      <svg
                        className="flex-shrink-0 w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      <span className="truncate">{naat.channelName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    <span className="truncate">{naat.youtubeId}</span>
                  </div>
                </button>
              ))}
            </div>

            {filteredNaats.length === 0 && !loading && (
              <div className="py-12 text-center text-gray-400 col-span-full">
                {searchQuery ? (
                  <>
                    <p className="text-lg">
                      No naats found matching "{searchQuery}"
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setSearchQuery("");
                      }}
                      className="mt-4 text-blue-400 underline hover:text-blue-300"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-lg">No naats available for cutting</p>
                    <p className="mt-2 text-sm">
                      All naats have been processed or don't have audio files
                    </p>
                  </>
                )}
              </div>
            )}

            {hasMore && !loading && naats.length > 0 && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}

            {naats.length > 0 && (
              <div className="mt-6 text-sm text-center text-gray-400">
                Showing {naats.length.toLocaleString()} of{" "}
                {totalCount.toLocaleString()} naats
              </div>
            )}

            {/* Back to Top Button */}
            {showBackToTop && (
              <button
                onClick={scrollToTop}
                className="fixed z-50 p-4 text-white transition-all bg-blue-600 rounded-full shadow-lg bottom-8 right-8 hover:bg-blue-700 hover:scale-110"
                title="Back to top"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => {
                setSelectedNaat(null);
                setCutSegments([{ start: 0, end: 0 }]);
                setDetectionResult(null);
              }}
              className="flex items-center gap-2 mb-6 text-gray-400 transition-colors hover:text-white"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to list
            </button>

            <div className="p-6 mb-6 bg-gray-800 rounded-lg">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-48 h-32 overflow-hidden bg-gray-700 rounded-lg">
                  <img
                    src={`https://img.youtube.com/vi/${selectedNaat.youtubeId}/mqdefault.jpg`}
                    alt={selectedNaat.title}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.currentTarget.src = `https://img.youtube.com/vi/${selectedNaat.youtubeId}/default.jpg`;
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h2 className="mb-2 text-2xl font-semibold">
                    {selectedNaat.title}
                  </h2>
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    <span>{selectedNaat.youtubeId}</span>
                  </div>
                  <p className="text-sm text-yellow-400">
                    💡 If this naat has no explanation parts, click "Skip - No
                    Explanation" below
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 mb-6 bg-gray-800 rounded-lg">
              <h2 className="mb-4 text-xl font-semibold">Original Audio</h2>
              <audio
                ref={(el) => setOriginalAudioRef(el)}
                controls
                className="w-full mb-3"
                src={getAudioUrl(selectedNaat.audioId)}
              />
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => seekAudio(originalAudioRef, -10)}
                  className="flex items-center gap-2 px-4 py-2 font-medium transition-colors bg-gray-700 rounded hover:bg-gray-600"
                  title="Rewind 10 seconds"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                    />
                  </svg>
                  -10s
                </button>
                <button
                  onClick={() => seekAudio(originalAudioRef, 10)}
                  className="flex items-center gap-2 px-4 py-2 font-medium transition-colors bg-gray-700 rounded hover:bg-gray-600"
                  title="Forward 10 seconds"
                >
                  +10s
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* AI Segment Detection */}
            <div className="p-6 mb-6 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    AI Segment Detection
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Automatically detect explanation vs naat segments using
                    audio analysis
                  </p>
                </div>
                <button
                  onClick={handleDetectSegments}
                  disabled={detecting}
                  className="flex items-center gap-2 px-6 py-3 font-semibold transition-colors bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {detecting ? (
                    <>
                      <svg
                        className="w-5 h-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      AI Detect
                    </>
                  )}
                </button>
              </div>

              {detecting && (
                <div className="p-4 border border-purple-700 rounded-lg bg-purple-900/30">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-6 h-6 text-purple-400 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-purple-300">
                        Analyzing audio...
                      </p>
                      <p className="text-sm text-gray-400">
                        Extracting spectral features to detect speech vs singing
                        patterns
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {detectionResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 text-center bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-400">Total Duration</p>
                      <p className="text-lg font-bold">
                        {Math.floor(detectionResult.duration / 60)}:
                        {String(
                          Math.floor(detectionResult.duration % 60),
                        ).padStart(2, "0")}
                      </p>
                    </div>
                    <div className="p-3 text-center border border-red-700 rounded-lg bg-red-900/30">
                      <p className="text-xs text-gray-400">Speech (to cut)</p>
                      <p className="text-lg font-bold text-red-400">
                        {Math.floor(detectionResult.totalSpeechDuration / 60)}:
                        {String(
                          Math.floor(detectionResult.totalSpeechDuration % 60),
                        ).padStart(2, "0")}
                      </p>
                    </div>
                    <div className="p-3 text-center border border-green-700 rounded-lg bg-green-900/30">
                      <p className="text-xs text-gray-400">Naat (to keep)</p>
                      <p className="text-lg font-bold text-green-400">
                        {Math.floor(detectionResult.totalSingingDuration / 60)}:
                        {String(
                          Math.floor(detectionResult.totalSingingDuration % 60),
                        ).padStart(2, "0")}
                      </p>
                    </div>
                  </div>

                  {/* Visual timeline */}
                  <div>
                    <p className="mb-2 text-sm font-medium">Timeline</p>
                    <div className="relative h-10 overflow-hidden bg-gray-700 rounded-lg">
                      {detectionResult.allSegments.map((seg, i) => {
                        const left =
                          (seg.start / detectionResult.duration) * 100;
                        const width =
                          ((seg.end - seg.start) / detectionResult.duration) *
                          100;
                        return (
                          <div
                            key={i}
                            className={`absolute top-0 h-full ${
                              seg.type === "speech"
                                ? "bg-red-500/60 border-red-400"
                                : "bg-green-500/60 border-green-400"
                            } border-x`}
                            style={{
                              left: `${left}%`,
                              width: `${Math.max(width, 0.5)}%`,
                            }}
                            title={`${seg.type}: ${Math.floor(seg.start / 60)}:${String(Math.floor(seg.start % 60)).padStart(2, "0")} - ${Math.floor(seg.end / 60)}:${String(Math.floor(seg.end % 60)).padStart(2, "0")} (${Math.round(seg.confidence * 100)}%)`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>0:00</span>
                      <span className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 rounded bg-red-500/60" />{" "}
                          Speech
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 rounded bg-green-500/60" />{" "}
                          Naat
                        </span>
                      </span>
                      <span>
                        {Math.floor(detectionResult.duration / 60)}:
                        {String(
                          Math.floor(detectionResult.duration % 60),
                        ).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Detected speech segments */}
                  {detectionResult.speechSegments.length > 0 ? (
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Detected Explanation Segments (
                        {detectionResult.speechSegments.length})
                      </p>
                      <div className="space-y-2">
                        {detectionResult.speechSegments.map((seg, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 px-4 py-2 border border-red-800 rounded-lg bg-red-900/20"
                          >
                            <span className="font-mono text-sm text-red-400">
                              {Math.floor(seg.start / 60)}:
                              {String(Math.floor(seg.start % 60)).padStart(
                                2,
                                "0",
                              )}
                              {" → "}
                              {Math.floor(seg.end / 60)}:
                              {String(Math.floor(seg.end % 60)).padStart(
                                2,
                                "0",
                              )}
                            </span>
                            <span className="text-sm text-gray-400">
                              ({seg.duration}s)
                            </span>
                            <span className="text-xs text-gray-500">
                              {Math.round(seg.confidence * 100)}% confident
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={applyDetectedSegments}
                        className="w-full px-6 py-3 mt-4 font-semibold transition-colors bg-purple-600 rounded-lg hover:bg-purple-700"
                      >
                        Apply Detected Segments as Cut Points
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 text-center border border-green-800 rounded-lg bg-green-900/20">
                      <p className="font-medium text-green-400">
                        No explanation segments detected
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        This naat appears to have no spoken explanations —
                        consider using &quot;Skip - No Explanation&quot;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 mb-6 bg-gray-800 rounded-lg">
              <h2 className="mb-4 text-xl font-semibold">
                Cut Segments (Parts to Remove)
              </h2>
              <p className="mb-4 text-sm text-gray-400">
                Enter the start and end times for the explanation parts you want
                to remove
              </p>

              <button
                onClick={addSegment}
                className="px-4 py-2 mb-4 bg-blue-600 rounded hover:bg-blue-700"
              >
                + Add Segment
              </button>

              {[...cutSegments].reverse().map((segment, reversedIndex) => {
                const index = cutSegments.length - 1 - reversedIndex;
                return (
                  <div key={index} className="p-4 mb-4 bg-gray-700 rounded-lg">
                    <div className="flex items-end gap-6">
                      <div className="flex-1">
                        <label className="block mb-2 text-sm font-medium">
                          Start Time
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block mb-1 text-xs text-gray-400">
                              Minutes
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded"
                              value={getMinutes(segment.start)}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                updateSegmentTime(
                                  index,
                                  "start",
                                  parseInt(val) || 0,
                                  getSeconds(segment.start),
                                );
                              }}
                            />
                          </div>
                          <span className="pb-2 text-2xl">:</span>
                          <div className="flex-1">
                            <label className="block mb-1 text-xs text-gray-400">
                              Seconds
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded"
                              value={getSeconds(segment.start)}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                const seconds = Math.min(
                                  parseInt(val) || 0,
                                  59,
                                );
                                updateSegmentTime(
                                  index,
                                  "start",
                                  getMinutes(segment.start),
                                  seconds,
                                );
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <label className="block mb-2 text-sm font-medium">
                          End Time
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block mb-1 text-xs text-gray-400">
                              Minutes
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded"
                              value={getMinutes(segment.end)}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                updateSegmentTime(
                                  index,
                                  "end",
                                  parseInt(val) || 0,
                                  getSeconds(segment.end),
                                );
                              }}
                            />
                          </div>
                          <span className="pb-2 text-2xl">:</span>
                          <div className="flex-1">
                            <label className="block mb-1 text-xs text-gray-400">
                              Seconds
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded"
                              value={getSeconds(segment.end)}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                const seconds = Math.min(
                                  parseInt(val) || 0,
                                  59,
                                );
                                updateSegmentTime(
                                  index,
                                  "end",
                                  getMinutes(segment.end),
                                  seconds,
                                );
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => removeSegment(index)}
                        className="h-10 px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                        disabled={cutSegments.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleSaveTimestamps}
                  disabled={saving}
                  className="flex-1 px-6 py-3 font-semibold bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "💾 Save Timestamps"}
                </button>
                <button
                  onClick={handleSkipNoExplanation}
                  disabled={skipping}
                  className="flex-1 px-6 py-3 font-semibold bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50"
                >
                  {skipping ? "Skipping..." : "Skip - No Explanation"}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
