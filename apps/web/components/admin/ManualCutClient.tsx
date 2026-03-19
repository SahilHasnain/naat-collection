"use client";

import { useEffect, useState } from "react";
import { Naat } from "./manual-cut/types";
import { useNaatList } from "./manual-cut/useNaatList";
import { useCutEditor } from "./manual-cut/useCutEditor";
import { useAiDetection } from "./manual-cut/useAiDetection";
import NaatListView from "./manual-cut/NaatListView";
import CutEditorView from "./manual-cut/CutEditorView";

export default function ManualCutClient() {
  const [selectedNaat, setSelectedNaat] = useState<Naat | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [queueingAiBatch, setQueueingAiBatch] = useState(false);
  const [queueingSingleAi, setQueueingSingleAi] = useState<string | null>(null);

  const list = useNaatList(selectedNaat?.$id ?? null);

  function handleDone() {
    setSelectedNaat(null);
    editor.resetSegments();
    ai.resetDetection();
    list.setNaats([]);
    list.setOffset(0);
    list.setHasMore(true);
    list.loadNaats(0, true);
  }

  const editor = useCutEditor(selectedNaat, handleDone, list.setError);
  const ai = useAiDetection(selectedNaat, editor.setCutSegments, list.setError);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Restore saved state on initial load
  useEffect(() => {
    if (list.naats.length === 0) return;
    const saved = localStorage.getItem("adminCutState");
    if (!saved) return;
    try {
      const { naatId, segments } = JSON.parse(saved);
      const naat = list.naats.find((n) => n.$id === naatId);
      if (naat) {
        setSelectedNaat(naat);
        if (segments?.length > 0) editor.setCutSegments(segments);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.naats]);

  function handleSelectNaat(naat: Naat) {
    setSelectedNaat(naat);
    editor.initSegments(naat);
    ai.resetDetection();
  }

  async function handleQueueVisibleForAi() {
    const eligibleNaatIds = list.naats
      .filter((naat) => naat.audioId && !naat.cutSegments)
      .map((naat) => naat.$id);

    if (eligibleNaatIds.length === 0) {
      list.setError("No eligible naats in the current list");
      return;
    }

    setQueueingAiBatch(true);
    list.setError(null);
    try {
      const response = await fetch("/api/admin/ai-detect-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naatIds: eligibleNaatIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to queue AI jobs");
      list.setError(`Queued ${data.queuedCount} naats for AI detection. Skipped ${data.skippedCount}.`);
    } catch (error) {
      list.setError(error instanceof Error ? error.message : "Failed to queue AI jobs");
    } finally {
      setQueueingAiBatch(false);
    }
  }

  async function handleQueueSingleForAi(naat: Naat) {
    if (!naat.audioId || naat.cutSegments) return;

    setQueueingSingleAi(naat.$id);
    list.setError(null);
    try {
      const response = await fetch("/api/admin/ai-detect-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naatIds: [naat.$id] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to queue AI job");
      list.setError(`Queued ${data.queuedCount} naat. Skipped ${data.skippedCount}.`);
    } catch (error) {
      list.setError(error instanceof Error ? error.message : "Failed to queue AI job");
    } finally {
      setQueueingSingleAi(null);
    }
  }

  if (list.loading) {
    return (
      <div className="min-h-screen p-8 text-white bg-gray-900">
        <div className="max-w-6xl mx-auto"><p>Loading naats...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 text-white bg-gray-900">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-3xl font-bold">Manual Audio Cut</h1>
        <p className="mb-8 text-gray-400">
          Select a naat to edit • {list.naats.length} available
        </p>

        {list.error && (
          <div className="px-4 py-3 mb-6 text-red-200 border border-red-500 rounded bg-red-900/50">
            {list.error}
          </div>
        )}

        {!selectedNaat ? (
          <NaatListView
            naats={list.naats}
            loading={list.loading}
            loadingMore={list.loadingMore}
            hasMore={list.hasMore}
            totalCount={list.totalCount}
            channels={list.channels}
            showBackToTop={showBackToTop}
            searchTerm={list.searchTerm}
            searchQuery={list.searchQuery}
            filterChannel={list.filterChannel}
            filterRadio={list.filterRadio}
            filterDuration={list.filterDuration}
            filterProcessed={list.filterProcessed}
            sortBy={list.sortBy}
            updatingExclude={list.updatingExclude}
            updatingRadio={list.updatingRadio}
            queueingSingleAi={queueingSingleAi}
            playingNaatId={list.playingNaatId}
            audioElement={list.audioElement}
            queueingAiBatch={queueingAiBatch}
            onSearchTermChange={list.setSearchTerm}
            onSearchSubmit={list.handleSearchSubmit}
            onFilterChannelChange={list.setFilterChannel}
            onFilterRadioChange={list.setFilterRadio}
            onFilterDurationChange={list.setFilterDuration}
            onFilterProcessedChange={list.setFilterProcessed}
            onSortByChange={list.setSortBy}
            onShuffle={list.shuffleResults}
            onLoadMore={list.loadMore}
            onScrollToTop={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            onSelectNaat={handleSelectNaat}
            onTogglePlay={list.togglePlayAudio}
            onToggleExclude={list.toggleExclude}
            onToggleRadio={list.toggleRadio}
            onQueueSingleForAi={handleQueueSingleForAi}
            onClearSearch={() => { list.setSearchTerm(""); list.setSearchQuery(""); }}
            onQueueVisibleForAi={handleQueueVisibleForAi}
          />
        ) : (
          <CutEditorView
            naat={selectedNaat}
            cutSegments={editor.cutSegments}
            saving={editor.saving}
            skipping={editor.skipping}
            draggedIndex={editor.draggedIndex}
            detecting={ai.detecting}
            detectionResult={ai.detectionResult}
            onBack={() => { setSelectedNaat(null); editor.resetSegments(); ai.resetDetection(); }}
            onAddSegment={editor.addSegment}
            onRemoveSegment={editor.removeSegment}
            onUpdateSegmentTime={editor.updateSegmentTime}
            onDragStart={editor.handleDragStart}
            onDragOver={editor.handleDragOver}
            onDrop={editor.handleDrop}
            onSave={editor.handleSave}
            onSkip={editor.handleSkip}
            onDetect={ai.handleDetect}
            onApplyDetected={ai.applyDetected}
            getMinutes={editor.getMinutes}
            getSeconds={editor.getSeconds}
          />
        )}
      </div>
    </div>
  );
}
