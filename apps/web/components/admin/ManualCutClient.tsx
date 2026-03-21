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
      .filter((naat) => naat.audioId && !naat.cutSegments && !naat.isAiCut)
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
      await list.loadAiJobStatuses(list.naats.map((naat) => naat.$id));
      list.setError(`Queued ${data.queuedCount} naats for AI detection. Skipped ${data.skippedCount}.`);
    } catch (error) {
      list.setError(error instanceof Error ? error.message : "Failed to queue AI jobs");
    } finally {
      setQueueingAiBatch(false);
    }
  }

  async function handleQueueSingleForAi(naat: Naat) {
    if (!naat.audioId || naat.cutSegments || naat.isAiCut) return;

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
      await list.loadAiJobStatuses(list.naats.map((item) => item.$id));
      list.setError(`Queued ${data.queuedCount} naat. Skipped ${data.skippedCount}.`);
    } catch (error) {
      list.setError(error instanceof Error ? error.message : "Failed to queue AI job");
    } finally {
      setQueueingSingleAi(null);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,_#171717_0%,_#0a0a0a_100%)] p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-white/8 bg-white/[0.03] px-6 py-6 shadow-2xl backdrop-blur-sm md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/75">Admin Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">Manual Audio Cut</h1>
          <p className="mt-3 text-sm text-neutral-400 md:text-base">
            Review, queue, and refine naat cuts with clearer status signals and faster actions. {list.loading ? "Loading..." : `${list.naats.length.toLocaleString()} available.`}
          </p>
        </div>

        {list.error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-red-100">
            {list.error}
          </div>
        )}

        {!selectedNaat ? (
          list.loading ? (
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-6 py-16 text-center text-neutral-400 shadow-xl">
              Loading naats...
            </div>
          ) : (
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
            filterExclude={list.filterExclude}
            filterDuration={list.filterDuration}
            filterProcessed={list.filterProcessed}
            filterAiCut={list.filterAiCut}
            sortBy={list.sortBy}
            updatingExclude={list.updatingExclude}
            updatingRadio={list.updatingRadio}
            updatingAiTrain={list.updatingAiTrain}
            queueingSingleAi={queueingSingleAi}
            aiJobStatuses={list.aiJobStatuses}
            playingNaatId={list.playingNaatId}
            audioElement={list.audioElement}
            queueingAiBatch={queueingAiBatch}
            onSearchTermChange={list.setSearchTerm}
            onSearchSubmit={list.handleSearchSubmit}
            onFilterChannelChange={list.setFilterChannel}
            onFilterRadioChange={list.setFilterRadio}
            onFilterExcludeChange={list.setFilterExclude}
            onFilterDurationChange={list.setFilterDuration}
            onFilterProcessedChange={list.setFilterProcessed}
            onFilterAiCutChange={list.setFilterAiCut}
            onSortByChange={list.setSortBy}
            onShuffle={list.shuffleResults}
            onLoadMore={list.loadMore}
            onScrollToTop={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            onSelectNaat={handleSelectNaat}
            onTogglePlay={list.togglePlayAudio}
            onToggleExclude={list.toggleExclude}
            onToggleRadio={list.toggleRadio}
            onToggleAiTrain={list.toggleAiTrain}
            onQueueSingleForAi={handleQueueSingleForAi}
            onClearSearch={() => { list.setSearchTerm(""); list.setSearchQuery(""); }}
            onQueueVisibleForAi={handleQueueVisibleForAi}
          />
          )
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
