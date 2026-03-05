"use client";

import { Client, Databases, Query } from "appwrite";
import { useEffect, useState } from "react";

interface Naat {
  $id: string;
  title: string;
  youtubeId: string;
  thumbnailUrl: string;
  channelName: string;
  duration: number;
  views: number;
  uploadDate: string;
  exclude?: boolean;
  radio?: boolean;
  $createdAt: string;
}

export default function ExcludeNaatsClient() {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingExclude, setUpdatingExclude] = useState<string | null>(null);
  const [updatingRadio, setUpdatingRadio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterExcluded, setFilterExcluded] = useState<"all" | "excluded" | "included">("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"latest" | "popular" | "oldest" | "random">("latest");
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [channels, setChannels] = useState<string[]>([]);
  const [randomSeed, setRandomSeed] = useState(0);

  const LIMIT = 50;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Reset and reload when filters change
    setNaats([]);
    setOffset(0);
    setHasMore(true);
    loadNaats(0, true);
  }, [sortBy, filterExcluded, filterChannel, searchTerm, randomSeed]);

  async function loadInitialData() {
    try {
      const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

      const databases = new Databases(client);

      // Load channels list (lightweight query)
      const channelsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        [Query.select(["channelName"]), Query.limit(5000)]
      );

      const uniqueChannels = Array.from(
        new Set(
          channelsResponse.documents
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
      const queries: string[] = [Query.limit(LIMIT), Query.offset(currentOffset)];

      // Sort query
      if (sortBy === "latest") {
        queries.push(Query.orderDesc("uploadDate"));
      } else if (sortBy === "oldest") {
        queries.push(Query.orderAsc("uploadDate"));
      } else if (sortBy === "popular") {
        queries.push(Query.orderDesc("views"));
      } else if (sortBy === "random") {
        queries.push(Query.orderRandom());
      }

      // Filter by exclude status
      if (filterExcluded === "excluded") {
        queries.push(Query.equal("exclude", true));
      } else if (filterExcluded === "included") {
        // Include naats where exclude is false OR null
        queries.push(
          Query.or([
            Query.equal("exclude", false),
            Query.isNull("exclude")
          ])
        );
      }

      // Filter by channel
      if (filterChannel !== "all") {
        queries.push(Query.equal("channelName", filterChannel));
      }

      // Search query
      if (searchTerm.trim()) {
        queries.push(Query.search("title", searchTerm.trim()));
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

  function shuffleResults() {
    setRandomSeed((prev) => prev + 1);
  }

  async function toggleExclude(naatId: string, currentExcludeStatus: boolean) {
    setUpdatingExclude(naatId);
    setError(null);

    try {
      const response = await fetch("/api/admin/toggle-exclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naatId,
          exclude: !currentExcludeStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update naat");
      }

      // Update local state
      setNaats(
        naats.map((naat) =>
          naat.$id === naatId
            ? { ...naat, exclude: !currentExcludeStatus }
            : naat
        )
      );
    } catch (err) {
      console.error("Toggle exclude error:", err);
      setError(err instanceof Error ? err.message : "Failed to update naat");
    } finally {
      setUpdatingExclude(null);
    }
  }

  async function toggleRadio(naatId: string, currentRadioStatus: boolean) {
    setUpdatingRadio(naatId);
    setError(null);

    try {
      const response = await fetch("/api/admin/toggle-radio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naatId,
          radio: !currentRadioStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update naat");
      }

      // Update local state
      setNaats(
        naats.map((naat) =>
          naat.$id === naatId
            ? { ...naat, radio: !currentRadioStatus }
            : naat
        )
      );
    } catch (err) {
      console.error("Toggle radio error:", err);
      setError(err instanceof Error ? err.message : "Failed to update naat");
    } finally {
      setUpdatingRadio(null);
    }
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  };

  // Get unique channels for filter dropdown
  const uniqueChannels = channels;

  const filteredNaats = naats;

  const excludedCount = naats.filter((n) => n.exclude).length;
  const includedCount = naats.length - excludedCount;

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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Exclude Naats</h1>
        <p className="text-gray-400 mb-8">
          Mark naats to exclude them from the app
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

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

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by title, YouTube ID, or channel..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <select
                className="w-full md:w-auto bg-gray-700 border border-gray-600 rounded px-4 py-2"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "latest" | "popular" | "oldest" | "random")
                }
              >
                <option value="latest">Latest</option>
                <option value="popular">Most Popular</option>
                <option value="oldest">Oldest</option>
                <option value="random">Random</option>
              </select>
              {sortBy === "random" && (
                <button
                  onClick={shuffleResults}
                  disabled={loading || loadingMore}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Shuffle results"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Shuffle
                </button>
              )}
              <select
                className="w-full md:w-auto bg-gray-700 border border-gray-600 rounded px-4 py-2"
                value={filterExcluded}
                onChange={(e) =>
                  setFilterExcluded(
                    e.target.value as "all" | "excluded" | "included"
                  )
                }
              >
                <option value="all">All Naats</option>
                <option value="included">Included Only</option>
                <option value="excluded">Excluded Only</option>
              </select>
              <select
                className="w-full md:w-auto bg-gray-700 border border-gray-600 rounded px-4 py-2"
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
              >
                <option value="all">All Channels</option>
                {uniqueChannels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNaats.length === 0 && !loading ? (
            <div className="col-span-full text-center py-12 text-gray-400">
              No naats found
            </div>
          ) : (
            filteredNaats.map((naat) => (
              <div
                key={naat.$id}
                className={`bg-gray-800 rounded-lg overflow-hidden transition-all hover:ring-2 hover:ring-gray-600 ${
                  naat.exclude ? "opacity-60 ring-2 ring-red-900/50" : ""
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-video bg-gray-700">
                  <img
                    src={naat.thumbnailUrl}
                    alt={naat.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Duration badge */}
                  <div className="absolute bottom-2 right-2 bg-black/80 rounded px-2 py-1">
                    <span className="text-xs font-bold text-white">
                      {formatDuration(naat.duration)}
                    </span>
                  </div>
                  {/* Exclude badge */}
                  {naat.exclude && (
                    <div className="absolute top-2 left-2 bg-red-600 rounded px-2 py-1">
                      <span className="text-xs font-bold text-white">
                        EXCLUDED
                      </span>
                    </div>
                  )}
                  {/* Radio badge */}
                  {naat.radio && (
                    <div className="absolute top-2 right-2 bg-green-600 rounded px-2 py-1">
                      <span className="text-xs font-bold text-white">
                        📻 RADIO
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Title */}
                  <h3 className="font-medium text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                    {naat.title}
                  </h3>

                  {/* Channel and metadata */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-3 h-3 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">
                        {naat.channelName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatViews(naat.views)} views · {formatRelativeTime(naat.uploadDate)}
                      </p>
                    </div>
                  </div>

                  {/* YouTube link */}
                  <a
                    href={`https://youtube.com/watch?v=${naat.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 mb-3 block truncate"
                  >
                    {naat.youtubeId}
                  </a>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        toggleExclude(naat.$id, naat.exclude || false)
                      }
                      disabled={updatingExclude === naat.$id}
                      className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
                        naat.exclude
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {updatingExclude === naat.$id
                        ? "..."
                        : naat.exclude
                          ? "✓ Include"
                          : "✗ Exclude"}
                    </button>

                    <button
                      onClick={() =>
                        toggleRadio(naat.$id, naat.radio || false)
                      }
                      disabled={updatingRadio === naat.$id}
                      className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
                        naat.radio
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-600 hover:bg-gray-700 text-white"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {updatingRadio === naat.$id
                        ? "..."
                        : naat.radio
                          ? "📻 ON"
                          : "📻 OFF"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {hasMore && !loading && (
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

        <div className="mt-6 text-sm text-gray-400 text-center">
          Showing {naats.length.toLocaleString()} of {totalCount.toLocaleString()} naats
        </div>
      </div>
    </div>
  );
}
