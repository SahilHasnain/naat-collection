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

export default function ManualCutClient() {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [selectedNaat, setSelectedNaat] = useState<Naat | null>(null);
  const [cutSegments, setCutSegments] = useState<CutSegment[]>([
    { start: 0, end: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tempFileId, setTempFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterRadio, setFilterRadio] = useState<"all" | "radio" | "non-radio">("all");
  const [filterDuration, setFilterDuration] = useState<"all" | "<=10min" | ">15min" | ">20min">("all");
  const [sortBy, setSortBy] = useState<"latest" | "popular" | "oldest">("latest");
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [channels, setChannels] = useState<string[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [originalAudioRef, setOriginalAudioRef] = useState<HTMLAudioElement | null>(null);
  const [previewAudioRef, setPreviewAudioRef] = useState<HTMLAudioElement | null>(null);
  const [cutDurationMinutes, setCutDurationMinutes] = useState<string>("");
  const [cutDurationSeconds, setCutDurationSeconds] = useState<string>("");

  const LIMIT = 50;

  const seekAudio = (audioRef: HTMLAudioElement | null, seconds: number) => {
    if (audioRef) {
      audioRef.currentTime = Math.max(0, Math.min(audioRef.currentTime + seconds, audioRef.duration || 0));
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
          tempFileId: tempFileId,
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
  }, [sortBy, filterRadio, filterChannel, filterDuration, searchQuery, selectedNaat]);

  useEffect(() => {
    // Restore pending cut after naats are loaded
    if (naats.length > 0 && !tempFileId) {
      const savedState = localStorage.getItem("pendingCut");
      if (savedState) {
        try {
          const { naatId, tempFileId: savedTempFileId } =
            JSON.parse(savedState);
          setTempFileId(savedTempFileId);
          const naat = naats.find((n) => n.$id === naatId);
          if (naat) {
            setSelectedNaat(naat);
          }
        } catch (err) {
          console.error("Failed to restore pending cut:", err);
          localStorage.removeItem("pendingCut");
        }
      }
    }
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
        [Query.select(["channelName"]), Query.limit(5000)]
      );

      const uniqueChannels = Array.from(
        new Set(
          channelsResponse.documents
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((doc: any) => doc.channelName)
            .filter(Boolean)
        )
      ).sort() as string[];

      setChannels(uniqueChannels);

      // Load first page of naats
      await loadNaats(0, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setLoading(false);
    }
  }

  async function loadNaats(currentOffset: number = offset, isInitial: boolean = false) {
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
        Query.isNull("cutAudio"),
        Query.or([
          Query.equal("exclude", false),
          Query.isNull("exclude")
        ]),
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
          Query.or([
            Query.equal("radio", false),
            Query.isNull("radio")
          ])
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
        queries
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
            const {
              naatId,
              segments,
              tempFileId: savedTempFileId,
            } = JSON.parse(saved);
            const naat = newNaats.find((n) => n.$id === naatId);
            if (naat) {
              setSelectedNaat(naat);
              if (segments?.length > 0) setCutSegments(segments);
              if (savedTempFileId) setTempFileId(savedTempFileId);
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

  async function handleCut() {
    if (!selectedNaat) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/cut-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naatId: selectedNaat.$id,
          cutSegments: cutSegments.filter((seg) => seg.start < seg.end),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cut audio");
      }

      // Poll for job completion
      const jobId = data.jobId;
      await pollJobStatus(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cut audio");
      setProcessing(false);
    }
  }

  async function pollJobStatus(jobId: string) {
    const maxAttempts = 120; // 10 minutes max (5 sec intervals)
    let attempts = 0;

    const poll = async () => {
      attempts++;

      try {
        const response = await fetch(`/api/admin/cut-audio?jobId=${jobId}`);
        const data = await response.json();

        if (data.status === "completed") {
          setTempFileId(data.tempFileId);
          setProcessing(false);
          // Save to localStorage for later approval
          if (selectedNaat) {
            localStorage.setItem(
              "pendingCut",
              JSON.stringify({
                naatId: selectedNaat.$id,
                tempFileId: data.tempFileId,
              }),
            );
          }
        } else if (data.status === "failed") {
          throw new Error(data.error || "Processing failed");
        } else if (attempts >= maxAttempts) {
          throw new Error("Processing timeout");
        } else {
          // Continue polling
          setTimeout(poll, 5000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check status");
        setProcessing(false);
      }
    };

    poll();
  }

  async function handleApprove() {
    if (!selectedNaat || !tempFileId) return;

    // Validate cut duration is provided
    const minutes = parseInt(cutDurationMinutes) || 0;
    const seconds = parseInt(cutDurationSeconds) || 0;
    const totalSeconds = minutes * 60 + seconds;

    if (totalSeconds <= 0) {
      setError("Please enter the cut audio duration");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/approve-cut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naatId: selectedNaat.$id,
          tempFileId,
          cutDuration: totalSeconds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve cut");
      }

      alert("Audio cut approved and saved!");

      clearState();

      setSelectedNaat(null);
      setTempFileId(null);
      setCutSegments([{ start: 0, end: 0 }]);
      setCutDurationMinutes("");
      setCutDurationSeconds("");
      // Reload the list
      setNaats([]);
      setOffset(0);
      setHasMore(true);
      loadNaats(0, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve cut");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!tempFileId) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/reject-cut", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempFileId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reject cut");
      }

      alert("Cut rejected and temp file deleted");

      clearState();

      setTempFileId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject cut");
    } finally {
      setProcessing(false);
    }
  }

  async function handleSkipNoExplanation() {
    if (!selectedNaat) return;

    const confirmed = confirm(
      `Mark "${selectedNaat.title}" as having no explanation parts?\n\nThis will use the original audio as the final version.`,
    );

    if (!confirmed) return;

    setProcessing(true);
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
      setTempFileId(null);
      setCutSegments([{ start: 0, end: 0 }]);
      // Reload the list
      setNaats([]);
      setOffset(0);
      setHasMore(true);
      loadNaats(0, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip naat");
    } finally {
      setProcessing(false);
    }
  }

  const getAudioUrl = (fileId: string, bucket: string = "audio-files") =>
    `/api/stream-audio?audioId=${fileId}&bucket=${bucket}`;

  const filteredNaats = naats.filter((naat) =>
    naat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    naat.youtubeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <p>Loading naats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Manual Audio Cut</h1>
        <p className="text-gray-400 mb-8">
          Select a naat to edit • {naats.length} available
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!selectedNaat ? (
          <div>
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Total Matching</p>
                  <p className="text-2xl font-bold">{totalCount.toLocaleString()}</p>
                </div>
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
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
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <svg
                    className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
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
                <div className="flex flex-col md:flex-row gap-4">
                  <select
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as "latest" | "popular" | "oldest")
                    }
                  >
                    <option value="latest">Latest</option>
                    <option value="popular">Most Popular</option>
                    <option value="oldest">Oldest</option>
                  </select>
                  <select
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2"
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
                <div className="flex flex-col md:flex-row gap-4">
                  <select
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2"
                    value={filterRadio}
                    onChange={(e) =>
                      setFilterRadio(
                        e.target.value as "all" | "radio" | "non-radio"
                      )
                    }
                  >
                    <option value="all">All Radio Status</option>
                    <option value="radio">Radio Only</option>
                    <option value="non-radio">Non-Radio Only</option>
                  </select>
                  <select
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2"
                    value={filterDuration}
                    onChange={(e) =>
                      setFilterDuration(
                        e.target.value as "all" | "<=10min" | ">15min" | ">20min"
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

              <p className="text-sm text-yellow-400 mt-4 flex items-center gap-2">
                <span>💡</span>
                <span>Click a card to start editing</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredNaats.map((naat) => (
                <button
                  key={naat.$id}
                  onClick={() => {
                    setSelectedNaat(naat);
                    setTempFileId(null);
                    setCutSegments([{ start: 0, end: 0 }]);
                  }}
                  className="bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 hover:border-blue-500 rounded-lg p-4 transition-all duration-200 text-left group shadow-lg hover:shadow-blue-500/20"
                >
                  <div className="aspect-video bg-gray-700 rounded-lg mb-3 overflow-hidden relative">
                    <img
                      src={`https://img.youtube.com/vi/${naat.youtubeId}/mqdefault.jpg`}
                      alt={naat.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.src = `https://img.youtube.com/vi/${naat.youtubeId}/default.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs">
                      {naat.duration
                        ? `${Math.floor(naat.duration / 60)}:${String(Math.floor(naat.duration % 60)).padStart(2, "0")}`
                        : "N/A"}
                    </div>
                    {naat.radio && (
                      <div className="absolute top-2 right-2 bg-green-600 rounded px-2 py-1">
                        <span className="text-xs font-bold text-white">
                          📻 RADIO
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                    {naat.title}
                  </h3>
                  {naat.channelName && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <svg
                        className="w-4 h-4 flex-shrink-0"
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
              <div className="col-span-full text-center py-12 text-gray-400">
                {searchQuery ? (
                  <>
                    <p className="text-lg">No naats found matching "{searchQuery}"</p>
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setSearchQuery("");
                      }}
                      className="mt-4 text-blue-400 hover:text-blue-300 underline"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-lg">No naats available for cutting</p>
                    <p className="text-sm mt-2">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}

            {naats.length > 0 && (
              <div className="mt-6 text-sm text-gray-400 text-center">
                Showing {naats.length.toLocaleString()} of {totalCount.toLocaleString()} naats
              </div>
            )}

            {/* Back to Top Button */}
            {showBackToTop && (
              <button
                onClick={scrollToTop}
                className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 z-50"
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
                setTempFileId(null);
                setCutSegments([{ start: 0, end: 0 }]);
              }}
              className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
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

            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex gap-4">
                <div className="w-48 h-32 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={`https://img.youtube.com/vi/${selectedNaat.youtubeId}/mqdefault.jpg`}
                    alt={selectedNaat.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://img.youtube.com/vi/${selectedNaat.youtubeId}/default.jpg`;
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-2">
                    {selectedNaat.title}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
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

            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Original Audio</h2>
              <audio
                ref={(el) => setOriginalAudioRef(el)}
                controls
                className="w-full mb-3"
                src={getAudioUrl(selectedNaat.audioId)}
              />
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => seekAudio(originalAudioRef, -10)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors flex items-center gap-2"
                  title="Rewind 10 seconds"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                  </svg>
                  -10s
                </button>
                <button
                  onClick={() => seekAudio(originalAudioRef, 10)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors flex items-center gap-2"
                  title="Forward 10 seconds"
                >
                  +10s
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                Cut Segments (Parts to Remove)
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Enter the start and end times for the explanation parts you want
                to remove
              </p>

              {cutSegments.map((segment, index) => (
                <div key={index} className="mb-4 p-4 bg-gray-700 rounded-lg">
                  <div className="flex gap-6 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2">
                        Start Time
                      </label>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">
                            Minutes
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
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
                        <span className="text-2xl pb-2">:</span>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">
                            Seconds
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
                            value={getSeconds(segment.start)}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              const seconds = Math.min(parseInt(val) || 0, 59);
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
                      <label className="block text-sm font-medium mb-2">
                        End Time
                      </label>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">
                            Minutes
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
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
                        <span className="text-2xl pb-2">:</span>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">
                            Seconds
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
                            value={getSeconds(segment.end)}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              const seconds = Math.min(parseInt(val) || 0, 59);
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
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded h-10"
                      disabled={cutSegments.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addSegment}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                + Add Segment
              </button>

              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleCut}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Cut Audio"}
                </button>
                <button
                  onClick={handleSkipNoExplanation}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded font-semibold disabled:opacity-50"
                >
                  Skip - No Explanation
                </button>
              </div>
            </div>

            {tempFileId && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  Preview (Cut Audio)
                </h2>
                <audio
                  ref={(el) => setPreviewAudioRef(el)}
                  controls
                  className="w-full mb-3"
                  src={getAudioUrl(tempFileId, "tempbucket")}
                />
                <div className="flex gap-2 justify-center mb-4">
                  <button
                    onClick={() => seekAudio(previewAudioRef, -10)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors flex items-center gap-2"
                    title="Rewind 10 seconds"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                    </svg>
                    -10s
                  </button>
                  <button
                    onClick={() => seekAudio(previewAudioRef, 10)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors flex items-center gap-2"
                    title="Forward 10 seconds"
                  >
                    +10s
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                    </svg>
                  </button>
                </div>

                <div className="bg-gray-700 rounded-lg p-4 mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Cut Audio Duration (Required)
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Enter the duration of the cut audio file
                  </p>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">
                        Minutes
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
                        value={cutDurationMinutes}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setCutDurationMinutes(val);
                        }}
                        placeholder="0"
                      />
                    </div>
                    <span className="text-2xl pb-2 mt-5">:</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">
                        Seconds
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
                        value={cutDurationSeconds}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const seconds = Math.min(parseInt(val) || 0, 59);
                          setCutDurationSeconds(seconds.toString());
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex-1 mt-5">
                      <div className="bg-gray-800 rounded px-3 py-2 text-center">
                        <span className="text-xs text-gray-400">Total: </span>
                        <span className="font-semibold">
                          {(parseInt(cutDurationMinutes) || 0) * 60 + (parseInt(cutDurationSeconds) || 0)} sec
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50"
                  >
                    {processing ? "Approving..." : "✓ Approve"}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={processing}
                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded font-semibold disabled:opacity-50"
                  >
                    {processing ? "Rejecting..." : "✗ Reject"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
