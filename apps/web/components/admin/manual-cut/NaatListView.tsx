"use client";

import { useState } from "react";
import { Naat, SortBy, FilterRadio, FilterDuration, FilterProcessed } from "./types";
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
  filterDuration: FilterDuration;
  filterProcessed: FilterProcessed;
  sortBy: SortBy;
  updatingExclude: string | null;
  updatingRadio: string | null;
  queueingSingleAi: string | null;
  queuedAiIds: Set<string>;
  playingNaatId: string | null;
  audioElement: HTMLAudioElement | null;
  queueingAiBatch: boolean;
  onSearchTermChange: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onFilterChannelChange: (v: string) => void;
  onFilterRadioChange: (v: FilterRadio) => void;
  onFilterDurationChange: (v: FilterDuration) => void;
  onFilterProcessedChange: (v: FilterProcessed) => void;
  onSortByChange: (v: SortBy) => void;
  onShuffle: () => void;
  onLoadMore: () => void;
  onScrollToTop: () => void;
  onSelectNaat: (naat: Naat) => void;
  onTogglePlay: (naat: Naat) => void;
  onToggleExclude: (id: string, current: boolean) => void;
  onToggleRadio: (id: string, current: boolean) => void;
  onQueueSingleForAi: (naat: Naat) => void;
  onClearSearch: () => void;
  onQueueVisibleForAi: () => void;
}

export default function NaatListView({
  naats, loading, loadingMore, hasMore, totalCount, channels, showBackToTop,
  searchTerm, searchQuery, filterChannel, filterRadio, filterDuration, filterProcessed, sortBy,
  updatingExclude, updatingRadio, queueingSingleAi, queuedAiIds, playingNaatId, audioElement, queueingAiBatch,
  onSearchTermChange, onSearchSubmit, onFilterChannelChange, onFilterRadioChange,
  onFilterDurationChange, onFilterProcessedChange, onSortByChange, onShuffle,
  onLoadMore, onScrollToTop, onSelectNaat, onTogglePlay, onToggleExclude, onToggleRadio, onQueueSingleForAi, onClearSearch,
  onQueueVisibleForAi,
}: Props) {
  const [viewingStatusNaat, setViewingStatusNaat] = useState<Naat | null>(null);

  return (
    <div>
      <div className="p-6 mb-6 bg-gray-800 rounded-lg">
        <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
          <div className="p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-400">Total Matching</p>
            <p className="text-2xl font-bold">{totalCount.toLocaleString()}</p>
          </div>
          <div className="p-4 border border-blue-700 rounded-lg bg-blue-900/30">
            <p className="text-sm text-gray-400">Loaded</p>
            <p className="text-2xl font-bold text-blue-400">{naats.length.toLocaleString()}</p>
          </div>
        </div>

        <form onSubmit={onSearchSubmit} className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by title or YouTube ID... (Press Enter)"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="w-full px-4 py-2 pl-10 transition-colors bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <svg className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <select className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded" value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}>
              <option value="latest">Latest</option>
              <option value="popular">Most Popular</option>
              <option value="oldest">Oldest</option>
              <option value="random">Random</option>
            </select>
            {sortBy === "random" && (
              <button onClick={onShuffle} disabled={loading || loadingMore}
                className="flex items-center gap-2 px-4 py-2 font-medium text-white transition-colors bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Shuffle
              </button>
            )}
            <select className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded" value={filterChannel}
              onChange={(e) => onFilterChannelChange(e.target.value)}>
              <option value="all">All Channels</option>
              {channels.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-4 md:flex-row">
            <select className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded" value={filterRadio}
              onChange={(e) => onFilterRadioChange(e.target.value as FilterRadio)}>
              <option value="all">All Radio Status</option>
              <option value="radio">Radio Only</option>
              <option value="non-radio">Non-Radio Only</option>
            </select>
            <select className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded" value={filterDuration}
              onChange={(e) => onFilterDurationChange(e.target.value as FilterDuration)}>
              <option value="all">All Durations</option>
              <option value="<=10min">10 min or less</option>
              <option value=">15min">Longer than 15 min</option>
              <option value=">20min">Longer than 20 min</option>
            </select>
            <select className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded" value={filterProcessed}
              onChange={(e) => onFilterProcessedChange(e.target.value as FilterProcessed)}>
              <option value="unprocessed">Unprocessed Only</option>
              <option value="all">All (Include Processed)</option>
              <option value="processed">Processed Only</option>
            </select>
          </div>
        </div>

        <p className="flex items-center gap-2 mt-4 text-sm text-yellow-400">
          <span>Click a card to start editing</span>
        </p>
        <div className="mt-4">
          <button
            onClick={onQueueVisibleForAi}
            disabled={queueingAiBatch || naats.length === 0}
            className="px-4 py-2 font-medium text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {queueingAiBatch ? "Queueing..." : `Queue Visible for AI (${naats.length})`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {naats.map((naat) => (
          <NaatCard
            key={naat.$id}
            naat={naat}
            isPlaying={playingNaatId === naat.$id}
            audioPaused={audioElement?.paused ?? true}
            updatingExclude={updatingExclude}
            updatingRadio={updatingRadio}
            queueingAi={queueingSingleAi}
            isQueuedForAi={queuedAiIds.has(naat.$id)}
            onSelect={() => onSelectNaat(naat)}
            onTogglePlay={() => onTogglePlay(naat)}
            onToggleExclude={() => onToggleExclude(naat.$id, naat.exclude || false)}
            onToggleRadio={() => onToggleRadio(naat.$id, naat.radio || false)}
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
