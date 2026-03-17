"use client";

import { useRef, useState } from "react";
import { CutSegment, DetectionResult, Naat } from "./types";

export function useAiDetection(
  selectedNaat: Naat | null,
  setCutSegments: (segments: CutSegment[]) => void,
  setError: (msg: string | null) => void,
) {
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleDetect() {
    if (!selectedNaat) return;
    setDetecting(true);
    setDetectionResult(null);
    setError(null);
    stopPolling();

    try {
      const res = await fetch("/api/admin/ai-detect-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naatId: selectedNaat.$id }),
      });
      const { jobId, error } = await res.json();
      if (!res.ok || !jobId) throw new Error(error || "Failed to start detection");

      // Poll every 3 seconds
      pollRef.current = setInterval(async () => {
        try {
          const poll = await fetch(`/api/admin/ai-detect-segments?jobId=${jobId}`);
          const data = await poll.json();

          if (data.status === "done") {
            stopPolling();
            setDetectionResult(data.result);
            setDetecting(false);
          } else if (data.status === "failed") {
            stopPolling();
            setError(data.error || "Detection failed");
            setDetecting(false);
          }
          // "pending" / "running" → keep polling
        } catch {
          // network hiccup — keep polling
        }
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
      setDetecting(false);
    }
  }

  function applyDetected() {
    if (!detectionResult?.speechSegments.length) return;
    setCutSegments(detectionResult.speechSegments.map((s) => ({
      start: Math.round(s.start),
      end: Math.round(s.end),
    })));
  }

  function resetDetection() {
    stopPolling();
    setDetectionResult(null);
  }

  return { detecting, detectionResult, handleDetect, applyDetected, resetDetection };
}
