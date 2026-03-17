"use client";

import { useState } from "react";
import { CutSegment, Naat } from "./types";

export function useCutEditor(
  selectedNaat: Naat | null,
  onDone: () => void,
  setError: (msg: string | null) => void,
) {
  const [cutSegments, setCutSegments] = useState<CutSegment[]>([{ start: 0, end: 0 }]);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function initSegments(naat: Naat) {
    if (naat.cutSegments) {
      try {
        setCutSegments(JSON.parse(naat.cutSegments));
        return;
      } catch {}
    }
    const draft = localStorage.getItem("cutSegmentsDraft");
    if (draft) {
      try {
        const { naatId, segments } = JSON.parse(draft);
        if (naatId === naat.$id && segments?.length > 0) {
          setCutSegments(segments);
          return;
        }
      } catch {}
    }
    setCutSegments([{ start: 0, end: 0 }]);
  }

  function resetSegments() {
    setCutSegments([{ start: 0, end: 0 }]);
  }

  function saveDraft(naat: Naat, segments: CutSegment[]) {
    localStorage.setItem("cutSegmentsDraft", JSON.stringify({ naatId: naat.$id, segments }));
  }

  function clearDraft() {
    localStorage.removeItem("cutSegmentsDraft");
    localStorage.removeItem("adminCutState");
  }

  function addSegment() {
    setCutSegments((prev) => [...prev, { start: 0, end: 0 }]);
  }

  function removeSegment(index: number) {
    setCutSegments((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSegmentTime(index: number, field: "start" | "end", minutes: number, seconds: number) {
    setCutSegments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: minutes * 60 + seconds };
      if (selectedNaat) saveDraft(selectedNaat, next);
      return next;
    });
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    setCutSegments((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(draggedIndex, 1);
      const adjusted = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
      next.splice(adjusted, 0, dragged);
      return next;
    });
    setDraggedIndex(null);
  }

  async function handleSave() {
    if (!selectedNaat) return;
    const valid = cutSegments.filter((s) => s.start < s.end);
    if (valid.length === 0) {
      setError("Add at least one valid segment (start must be less than end)");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/save-timestamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naatId: selectedNaat.$id, cutSegments: valid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save timestamps");
      alert(selectedNaat.cutSegments ? "Timestamps updated successfully!" : "Timestamps saved!");
      clearDraft();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save timestamps");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (!selectedNaat) return;
    if (!confirm(`Mark "${selectedNaat.title}" as having no explanation parts?\n\nThis will use the original audio as the final version.`)) return;
    setSkipping(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/skip-no-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naatId: selectedNaat.$id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to skip naat");
      clearDraft();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip naat");
    } finally {
      setSkipping(false);
    }
  }

  function getMinutes(s: number) { return Math.floor(s / 60); }
  function getSeconds(s: number) { return Math.floor(s % 60); }

  return {
    cutSegments, setCutSegments, saving, skipping, draggedIndex,
    initSegments, resetSegments,
    addSegment, removeSegment, updateSegmentTime,
    handleDragStart, handleDragOver, handleDrop,
    handleSave, handleSkip,
    getMinutes, getSeconds,
  };
}
