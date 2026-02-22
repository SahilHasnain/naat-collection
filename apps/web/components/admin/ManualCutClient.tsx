"use client";

import { Client, Databases, Query } from "appwrite";
import { useEffect, useState } from "react";

interface Naat {
  $id: string;
  title: string;
  youtubeId: string;
  audioId: string;
  duration?: number;
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
  const [processing, setProcessing] = useState(false);
  const [tempFileId, setTempFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    loadNaats();
  }, []);

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

  async function loadNaats() {
    try {
      const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

      const databases = new Databases(client);

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        [
          Query.isNotNull("audioId"),
          Query.isNull("cutAudio"),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      );

      setNaats(response.documents as unknown as Naat[]);

      // Restore saved state
      const saved = localStorage.getItem("adminCutState");
      if (saved) {
        try {
          const {
            naatId,
            segments,
            tempFileId: savedTempFileId,
          } = JSON.parse(saved);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const naat = response.documents.find((n: any) => n.$id === naatId);
          if (naat) {
            setSelectedNaat(naat as unknown as Naat);
            if (segments?.length > 0) setCutSegments(segments);
            if (savedTempFileId) setTempFileId(savedTempFileId);
          }
        } catch (err) {
          console.error("Failed to restore:", err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load naats");
    } finally {
      setLoading(false);
    }
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

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/approve-cut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naatId: selectedNaat.$id,
          tempFileId,
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
      loadNaats();
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

  const getAudioUrl = (fileId: string, bucket: string = "audio-files") =>
    `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${bucket}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;

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
        <h1 className="text-3xl font-bold mb-8">Manual Audio Cut</h1>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <label className="block text-sm font-medium mb-2">Select Naat</label>
          <select
            className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2"
            value={selectedNaat?.$id || ""}
            onChange={(e) => {
              const naat = naats.find((n) => n.$id === e.target.value);
              setSelectedNaat(naat || null);
              setTempFileId(null);
              setCutSegments([{ start: 0, end: 0 }]);
            }}
          >
            <option value="">-- Select a naat --</option>
            {naats.map((naat) => (
              <option key={naat.$id} value={naat.$id}>
                {naat.title} ({naat.youtubeId})
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-400 mt-2">
            Showing {naats.length} naats with audio but no cut version
          </p>
        </div>

        {selectedNaat && (
          <>
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Original Audio</h2>
              <audio
                controls
                className="w-full"
                src={getAudioUrl(selectedNaat.audioId)}
              />
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

              <button
                onClick={handleCut}
                disabled={processing}
                className="mt-4 w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50"
              >
                {processing ? "Processing..." : "Cut Audio"}
              </button>
            </div>

            {tempFileId && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  Preview (Cut Audio)
                </h2>
                <audio
                  controls
                  className="w-full mb-4"
                  src={getAudioUrl(tempFileId, "tempbucket")}
                />

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
          </>
        )}
      </div>
    </div>
  );
}
