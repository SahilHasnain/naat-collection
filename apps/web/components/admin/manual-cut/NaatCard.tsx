"use client";

import { Naat } from "./types";

interface Props {
  naat: Naat;
  isPlaying: boolean;
  audioPaused: boolean;
  updatingExclude: string | null;
  updatingRadio: string | null;
  onSelect: () => void;
  onTogglePlay: () => void;
  onToggleExclude: () => void;
  onToggleRadio: () => void;
  onViewStatus: () => void;
}

export default function NaatCard({
  naat, isPlaying, audioPaused,
  updatingExclude, updatingRadio,
  onSelect, onTogglePlay, onToggleExclude, onToggleRadio, onViewStatus,
}: Props) {
  const hasTimestamps = !!naat.cutSegments;

  return (
    <div className={`text-left transition-all duration-200 bg-gray-800 border-2 rounded-lg shadow-lg group ${
      naat.exclude ? "border-red-900/50 opacity-60" : "border-gray-700"
    } ${isPlaying ? "border-blue-500" : "hover:border-blue-500"}`}>
      <button onClick={onSelect} className="w-full p-4 text-left">
        <div
          className="relative mb-3 overflow-hidden bg-gray-700 rounded-lg aspect-video cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
        >
          <img
            src={`https://img.youtube.com/vi/${naat.youtubeId}/mqdefault.jpg`}
            alt={naat.title}
            className="object-cover w-full h-full transition-transform group-hover:scale-105"
            onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${naat.youtubeId}/default.jpg`; }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            {isPlaying && !audioPaused ? (
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          <div className="absolute px-2 py-1 text-xs rounded bottom-2 right-2 bg-black/80">
            {naat.duration ? `${Math.floor(naat.duration / 60)}:${String(Math.floor(naat.duration % 60)).padStart(2, "0")}` : "N/A"}
          </div>
          {naat.exclude && (
            <div className="absolute px-2 py-1 bg-red-600 rounded top-2 left-2">
              <span className="text-xs font-bold text-white">EXCLUDED</span>
            </div>
          )}
          {hasTimestamps && (
            <div className={`absolute px-2 py-1 bg-blue-600 rounded ${naat.exclude ? "top-8" : "top-2"} left-2`}>
              <span className="text-xs font-bold text-white">✂️ EDITED</span>
            </div>
          )}
          {naat.radio && (
            <div className="absolute px-2 py-1 bg-green-600 rounded top-2 right-2">
              <span className="text-xs font-bold text-white">📻 RADIO</span>
            </div>
          )}
        </div>

        <h3 className="mb-2 font-semibold text-white transition-colors group-hover:text-blue-400 line-clamp-2">
          {naat.title}
        </h3>
        {naat.channelName && (
          <p className="mb-1 text-xs text-gray-400 truncate">{naat.channelName}</p>
        )}
        <p className="text-xs text-gray-500 truncate">{naat.youtubeId}</p>
        {hasTimestamps && <p className="mt-2 text-xs text-blue-400">Click to edit timestamps</p>}
      </button>

      <div className="flex gap-2 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleExclude}
          disabled={updatingExclude === naat.$id}
          className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
            naat.exclude ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
          } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {updatingExclude === naat.$id ? "..." : naat.exclude ? "✓ Include" : "✗ Exclude"}
        </button>
        <button
          onClick={onToggleRadio}
          disabled={updatingRadio === naat.$id}
          className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
            naat.radio ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"
          } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {updatingRadio === naat.$id ? "..." : naat.radio ? "📻 ON" : "📻 OFF"}
        </button>
        <button
          onClick={onViewStatus}
          className="px-3 py-2 rounded font-medium text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors"
          title="View DB document status"
        >
          DB
        </button>
      </div>
    </div>
  );
}
