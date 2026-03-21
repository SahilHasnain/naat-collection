"use client";

import { useState } from "react";
import { Naat, SortBy, FilterRadio, FilterExclude, FilterDuration, FilterProcessed, FilterAiCut } from "./types";
import NaatCard from "./NaatCard";
import DbStatusModal from "./DbStatusModal";

interface Props {
  naats: Naat[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  channels: string[];
  showBackToTop: boolean;
  searchTerm: string;
  searchQuery: string;
  filterChannel: string;
  filterRadio: FilterRadio;
  filterExclude: FilterExclude;
  filterDuration: FilterDuration;
  filterProcessed: FilterProcessed;
  filterAiCut: FilterAiCut;
  sortBy: SortBy;
  updatingExclude: string | null;
  updatingRadio: string | null;
  updatingAiTrain: string | null;
  queueingSingleAi: string | null;
  aiJobStatuses: Record<string, string>;
  playingNaatId: string | null;
  audioElement: HTMLAudioElement | null;
  queueingAiBatch: boolean;
  onSearchTermChange: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onFilterChannelChange: (v: string) => void;
  onFilterRadioChange: (v: FilterRadio) => void;
  onFilterExcludeChange: (v: FilterExclude) => void;
  onFilterDurationChange: (v: FilterDuration) => void;
  onFilterProcessedChange: (v: FilterProcessed) => void;
  onFilterAiCutChange: (v: FilterAiCut) => void;
  onSortByChange: (v: SortBy) => void;
  onShuffle: () => void;
  onLoadMore: () => void;
  onScrollToTop: () => void;
  onSelectNaat: (naat: Naat) => void;
  onTogglePlay: (naat: Naat) => void;
  onToggleExclude: (id: string, current: boolean) => void;
  onToggleRadio: (id: string, current: boolean) => void;
  onToggleAiTrain: (id: string, current: boolean) => void;
  onQueueSingleForAi: (naat: Naat) => void;
  onClearSearch: () => void;
  onQueueVisibleForAi: () => void;
}

export default function NaatListView({
  naats, loading, loadingMore, hasMore, totalCount, channels, showBackToTop,
  searchTerm, searchQuery, filterChannel, filterRadio, filterExclude, filterDuration, filterProcessed, filterAiCut, sortBy,
  updatingExclude, updatingRadio, updatingAiTrain, queueingSingleAi, aiJobStatuses, playingNaatId, audioElement, queueingAiBatch,
  onSearchTermChange, onSearchSubmit, onFilterChannelChange, onFilterRadioChange, onFilterExcludeChange,
  onFilterDurationChange, onFilterProcessedChange, onFilterAiCutChange, onSortByChange, onShuffle,
  onLoadMore, onScrollToTop, onSelectNaat, onTogglePlay, onToggleExclude, onToggleRadio, onToggleAiTrain, onQueueSingleForAi, onClearSearch,
  onQueueVisibleForAi,
}: Props) {
  const [viewingStatusNaat, setViewingStatusNaat] = useState<Naat | null>(null);

  return (
    <div>
      <div className="mb-8 overflow-hidden border shadow-2xl rounded-3xl border-white/8 bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950">
        <div className="border-b border-white/8 px-6 py-6 md:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <p className="text-xs font-semibold tracking-[0.18em] text-neutral-400 uppercase">Total Matching</p>
              <p className="mt-2 text-3xl font-semibold text-white">{totalCount.toLocaleString()}</p>
              <p className="mt-1 text-sm text-neutral-500">Results after current filters</p>
            </div>
            <div className="rounded-2xl border border-sky-400/15 bg-sky-500/10 p-5">
              <p className="text-xs font-semibold tracking-[0.18em] text-sky-200/70 uppercase">Loaded Now</p>
              <p className="mt-2 text-3xl font-semibold text-sky-300">{naats.length.toLocaleString()}</p>
              <p className="mt-1 text-sm text-sky-100/60">Cards currently rendered for review</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6 md:px-8">
        <form onSubmit={onSearchSubmit} className="mb-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by title or YouTube ID... (Press Enter)"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pl-11 text-sm text-white transition placeholder:text-neutral-500 focus:border-sky-400/60 focus:outline-none"
            />
            <svg className="absolute w-5 h-5 text-neutral-500 -translate-y-1/2 left-4 top-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <select className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}>
              <option value="latest">Latest</option>
              <option value="popular">Most Popular</option>
              <option value="oldest">Oldest</option>
              <option value="random">Random</option>
            </select>
            {sortBy === "random" && (
              <button onClick={onShuffle} disabled={loading || loadingMore}
                className="flex items-center justify-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-500/22 disabled:cursor-not-allowed disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Shuffle
              </button>
            )}
            <select className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" value={filterChannel}
              onChange={(e) => onFilterChannelChange(e.target.value)}>
              <option value="all">All Channels</option>
              {channels.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-4 md:flex-row">
            <select className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" value={filterRadio}
              onChange={(e) => onFilterRadioChange(e.target.value as FilterRadio)}>
              <option value="all">All Radio Status</option>
              <option value="radio">Radio Only</option>
              <option value="non-radio">Non-Radio Only</option>
            </select>
            <select className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" value={filterExclude}
              onChange={(e) => onFilterExcludeChange(e.target.value as FilterExclude)}>
              <option value="all">All Exclude Status</option>
              <option value="included">Included Only</option>
              <option value="excluded">Excluded Only</option>
            </select>
            <select className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" value={filterDuration}
              onChange={(e) => onFilterDurationChange(e.target.value as FilterDuration)}>
              <option value="all">All Durations</option>
              <option value="<=10min">10 min or less</option>
              <option value=">15min">Longer than 15 min</option>
              <option value=">20min">Longer than 20 min</option>
            </select>
            <select className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" value={filterProcessed}
              onChange={(e) => onFilterProcessedChange(e.target.value as FilterProcessed)}>
              <option value="unprocessed">Unprocessed Only</option>
              <option value="all">All (Include Processed)</option>
              <option value="processed">Processed Only</option>
            </select>
            <select className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" value={filterAiCut}
              onChange={(e) => onFilterAiCutChange(e.target.value as FilterAiCut)}>
              <option value="all">All AI Cut Status</option>
              <option value="ai-cut">AI Cut Only</option>
              <option value="non-ai-cut">Non-AI Cut Only</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/8 pt-5 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2 text-sm text-amber-300">
          <span>Click a card to start editing</span>
        </p>
          <button
            onClick={onQueueVisibleForAi}
            disabled={queueingAiBatch || naats.length === 0}
            className="rounded-2xl border border-emerald-400/20 bg-emerald-500/12 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/22 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {queueingAiBatch ? "Queueing..." : `Queue Visible for AI (${naats.length})`}
          </button>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {naats.map((naat) => (
          <NaatCard
            key={naat.$id}
            naat={naat}
            isPlaying={playingNaatId === naat.$id}
            audioPaused={audioElement?.paused ?? true}
            updatingExclude={updatingExclude}
            updatingRadio={updatingRadio}
            updatingAiTrain={updatingAiTrain}
            queueingAi={queueingSingleAi}
            aiJobStatus={aiJobStatuses[naat.$id] ?? null}
            onSelect={() => onSelectNaat(naat)}
            onTogglePlay={() => onTogglePlay(naat)}
            onToggleExclude={() => onToggleExclude(naat.$id, naat.exclude || false)}
            onToggleRadio={() => onToggleRadio(naat.$id, naat.radio || false)}
            onToggleAiTrain={() => onToggleAiTrain(naat.$id, naat.aiTrain || false)}
            onViewStatus={() => setViewingStatusNaat(naat)}
            onQueueAi={() => onQueueSingleForAi(naat)}
          />
        ))}
      </div>

      {naats.length === 0 && !loading && (
        <div className="py-12 text-center text-gray-400">
          {searchQuery ? (
            <>
              <p className="text-lg">No naats found matching &quot;{searchQuery}&quot;</p>
              <button onClick={onClearSearch} className="mt-4 text-blue-400 underline hover:text-blue-300">
                Clear search
              </button>
            </>
          ) : (
            <>
              <p className="text-lg">No naats available for cutting</p>
              <p className="mt-2 text-sm">All naats have been processed or do not have audio files</p>
            </>
          )}
        </div>
      )}

      {hasMore && !loading && naats.length > 0 && (
        <div className="mt-6 text-center">
          <button onClick={onLoadMore} disabled={loadingMore}
            className="px-8 py-3 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {naats.length > 0 && (
        <div className="mt-6 text-sm text-center text-gray-400">
          Showing {naats.length.toLocaleString()} of {totalCount.toLocaleString()} naats
        </div>
      )}

      {showBackToTop && (
        <button onClick={onScrollToTop}
          className="fixed z-50 p-4 text-white transition-all bg-blue-600 rounded-full shadow-lg bottom-8 right-8 hover:bg-blue-700 hover:scale-110"
          title="Back to top">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {viewingStatusNaat && (
        <DbStatusModal naat={viewingStatusNaat} onClose={() => setViewingStatusNaat(null)} />
      )}
    </div>
  );
}
