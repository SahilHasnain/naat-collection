"use client";

import { databases, storage } from "@/lib/appwrite";
import { Query } from "appwrite";
import { useEffect, useState } from "react";

interface Naat {
  $id: string;
  title: string;
  channelName: string;
  youtubeId: string;
  duration: number;
  thumbnailUrl: string;
  audioId: string;
  cutAudio: string;
  $createdAt: string;
  $updatedAt: string;
}

export default function ProcessedAudioClient() {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingNaat, setPlayingNaat] = useState<string | null>(null);
  const [audioType, setAudioType] = useState<"original" | "processed">(
    "processed",
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadProcessedNaats();
  }, []);

  async function loadProcessedNaats() {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        [
          Query.isNotNull("cutAudio"),
          Query.orderDesc("$updatedAt"),
          Query.limit(50),
        ],
      );

      setNaats(response.documents as unknown as Naat[]);
    } catch (error) {
      console.error("Failed to load processed naats:", error);
    } finally {
      setLoading(false);
    }
  }

  async function getAudioUrl(audioId: string): Promise<string> {
    try {
      const result = await storage.getFileView("audio-files", audioId);
      return result.href;
    } catch (error) {
      console.error("Failed to get audio URL:", error);
      throw error;
    }
  }

  async function deleteCutAudio(naat: Naat) {
    if (
      !confirm(
        `Delete processed audio for "${naat.title}"?\n\nThis will revert to the original audio.`,
      )
    ) {
      return;
    }

    try {
      setDeleting(naat.$id);

      // Delete the cutAudio file from storage
      await storage.deleteFile("audio-files", naat.cutAudio);

      // Update the database to remove cutAudio reference
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        naat.$id,
        { cutAudio: null },
      );

      // Reload the list
      await loadProcessedNaats();

      alert("Processed audio deleted successfully!");
    } catch (error) {
      console.error("Failed to delete cutAudio:", error);
      alert("Failed to delete processed audio. Check console for details.");
    } finally {
      setDeleting(null);
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Processed Audio Review</h1>
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading processed naats...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Processed Audio Review</h1>
          <p className="text-gray-400">
            Review AI-processed audio files. Listen to both versions and delete
            if not satisfied.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Total processed: {naats.length} naats
          </p>
        </div>

        {naats.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No processed naats found.</p>
            <p className="text-gray-500 text-sm mt-2">
              Run the AI processing script to generate processed audio.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {naats.map((naat) => (
              <div
                key={naat.$id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition"
              >
                <div className="flex gap-6">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    <img
                      src={naat.thumbnailUrl}
                      alt={naat.title}
                      className="w-40 h-24 object-cover rounded"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{naat.title}</h3>
                    <p className="text-gray-400 text-sm mb-2">
                      {naat.channelName}
                    </p>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Duration: {formatDuration(naat.duration)}</span>
                      <span>•</span>
                      <span>YouTube ID: {naat.youtubeId}</span>
                      <span>•</span>
                      <span>Processed: {formatDate(naat.$updatedAt)}</span>
                    </div>

                    {/* Audio Players */}
                    <div className="mt-4 space-y-3">
                      {/* Original Audio */}
                      <div className="bg-gray-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-300">
                            🎵 Original Audio
                          </span>
                        </div>
                        <audio
                          controls
                          className="w-full"
                          preload="none"
                          onPlay={() => setPlayingNaat(naat.$id + "-original")}
                        >
                          <source
                            src={`${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/audio-files/files/${naat.audioId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`}
                            type="audio/mpeg"
                          />
                        </audio>
                      </div>

                      {/* Processed Audio */}
                      <div className="bg-green-900/30 border border-green-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-300">
                            ✨ Processed Audio (AI-cleaned)
                          </span>
                          <span className="text-xs text-gray-400">
                            ID: {naat.cutAudio}
                          </span>
                        </div>
                        <audio
                          controls
                          className="w-full"
                          preload="none"
                          src={`${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/audio-files/files/${naat.cutAudio}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`}
                          onPlay={() => setPlayingNaat(naat.$id + "-processed")}
                          onError={(e) => {
                            const target = e.currentTarget as HTMLAudioElement;
                            console.error("Processed audio error details:", {
                              error: target.error,
                              code: target.error?.code,
                              message: target.error?.message,
                              src: target.currentSrc,
                              networkState: target.networkState,
                              readyState: target.readyState,
                            });
                          }}
                        >
                          Your browser does not support the audio element.
                        </audio>
                        <div className="mt-2">
                          <a
                            href={`${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/audio-files/files/${naat.cutAudio}/download?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-400 hover:text-green-300"
                          >
                            📥 Download processed audio
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => deleteCutAudio(naat)}
                        disabled={deleting === naat.$id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition"
                      >
                        {deleting === naat.$id
                          ? "Deleting..."
                          : "🗑️ Delete Processed Audio"}
                      </button>
                      <a
                        href={`https://www.youtube.com/watch?v=${naat.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
                      >
                        📺 View on YouTube
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
