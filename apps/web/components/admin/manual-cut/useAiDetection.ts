"use client";

import { useState } from "react";
import { CutSegment, DetectionResult, Naat } from "./types";

export function useAiDetection(
  selectedNaat: Naat | null,
  setCutSegments: (segments: CutSegment[]) => void,
  setError: (msg: string | null) => void,
) {
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);

  async function handleDetect() {
    if (!selectedNaat) return;
    setDetecting(true);
    setDetectionResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-detect-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naatId: selectedNaat.$id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Detection failed");
      setDetectionResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
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
    setDetectionResult(null);
  }

  return { detecting, detectionResult, handleDetect, applyDetected, resetDetection };
}
