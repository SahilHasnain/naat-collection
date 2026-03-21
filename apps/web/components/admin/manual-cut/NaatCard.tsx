"use client";

import { Naat } from "./types";

interface Props {
  naat: Naat;
  isPlaying: boolean;
  audioPaused: boolean;
  updatingExclude: string | null;
  updatingRadio: string | null;
  updatingAiTrain: string | null;
  queueingAi: string | null;
  aiJobStatus: string | null;
  onSelect: () => void;
  onTogglePlay: () => void;
  onToggleExclude: () => void;
  onToggleRadio: () => void;
  onToggleAiTrain: () => void;
  onViewStatus: () => void;
  onQueueAi: () => void;
}

export default function NaatCard({
  naat, isPlaying, audioPaused,
  updatingExclude, updatingRadio, updatingAiTrain, queueingAi, aiJobStatus,
  onSelect, onTogglePlay, onToggleExclude, onToggleRadio, onToggleAiTrain, onViewStatus, onQueueAi,
}: Props) {
  const hasTimestamps = !!naat.cutSegments;
  const isQueuedForAi = aiJobStatus === "pending" || aiJobStatus === "running";
  const aiStatusLabel = aiJobStatus === "running" ? "AI Running" : "AI Queued";
  const durationLabel = naat.duration
    ? `${Math.floor(naat.duration / 60)}:${String(Math.floor(naat.duration % 60)).padStart(2, "0")}`
    : "N/A";
  const badgeBaseClass =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase";
  const cardStateClass = naat.exclude
    ? "border-red-950/60 bg-gradient-to-b from-red-950/35 via-neutral-900 to-neutral-950 opacity-75"
    : "border-white/8 bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950";

  return (
    <article className={`group overflow-hidden rounded-3xl border text-left shadow-xl transition-all duration-300 ${
      cardStateClass
    } ${isPlaying ? "ring-1 ring-sky-400/70 border-sky-400/50 shadow-sky-950/40" : "hover:-translate-y-1 hover:border-sky-400/40 hover:shadow-2xl"}`}>
      <button onClick={onSelect} className="w-full p-4 text-left md:p-5">
        <div
          className="relative mb-4 overflow-hidden border aspect-video cursor-pointer rounded-2xl border-white/10 bg-neutral-800"
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
        >
          <img
            src={`https://img.youtube.com/vi/${naat.youtubeId}/mqdefault.jpg`}
            alt={naat.title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-[1.04]"
            onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${naat.youtubeId}/default.jpg`; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_48%)]" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {naat.exclude && (
              <span className={`${badgeBaseClass} border-red-400/30 bg-red-500/90 text-white`}>
                Excluded
              </span>
            )}
            {hasTimestamps && (
              <span className={`${badgeBaseClass} border-sky-400/30 bg-sky-500/90 text-white`}>
                Edited
              </span>
            )}
            {naat.radio && (
              <span className={`${badgeBaseClass} border-emerald-400/30 bg-emerald-500/90 text-white`}>
                Radio
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            {naat.aiTrain && (
              <span className={`${badgeBaseClass} border-fuchsia-400/30 bg-fuchsia-500/85 text-white`}>
                AI Train
              </span>
            )}
            {isQueuedForAi && (
              <span className={`${badgeBaseClass} border-amber-400/30 bg-amber-500/90 text-neutral-950`}>
                {aiStatusLabel}
              </span>
            )}
          </div>

          <div className="absolute right-3 top-3 flex items-center gap-2">
            <span className="rounded-full border border-white/15 bg-black/65 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {durationLabel}
            </span>
            <div className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 backdrop-blur-sm transition ${
              isPlaying && !audioPaused ? "bg-sky-500 text-white" : "bg-black/50 text-white group-hover:bg-white/15"
            }`}>
              {isPlaying && !audioPaused ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <h3 className="text-base font-semibold leading-6 text-white transition-colors line-clamp-2 group-hover:text-sky-300">
              {naat.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
              {naat.channelName && <span className="max-w-full truncate">{naat.channelName}</span>}
              <span className="text-neutral-600">•</span>
              <span className="font-mono text-[11px] tracking-wide text-neutral-500">{naat.youtubeId}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              hasTimestamps ? "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20" : "bg-neutral-800 text-neutral-300 ring-1 ring-white/8"
            }`}>
              {hasTimestamps ? "Ready to refine" : "Needs cut review"}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              naat.audioId ? "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/20" : "bg-red-500/12 text-red-300 ring-1 ring-red-400/20"
            }`}>
              {naat.audioId ? "Audio linked" : "Missing audio"}
            </span>
            {naat.isAiCut && (
              <span className="rounded-full bg-amber-500/12 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-400/20">
                AI cut source
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <p className="text-neutral-400">
              {hasTimestamps ? "Open to adjust timestamps" : "Open to create timestamps"}
            </p>
            <span className="font-medium text-sky-300">Edit</span>
          </div>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2 border-t border-white/8 px-4 pb-4 pt-3 md:px-5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onQueueAi}
          disabled={queueingAi === naat.$id || isQueuedForAi || !naat.audioId || hasTimestamps}
          className="rounded-xl border border-emerald-400/20 bg-emerald-500/12 px-3 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/22 disabled:cursor-not-allowed disabled:opacity-50"
          title="Queue this naat for AI detection"
        >
          {queueingAi === naat.$id ? "Queueing..." : isQueuedForAi ? aiStatusLabel : "Queue AI"}
        </button>
        <button
          onClick={onToggleExclude}
          disabled={updatingExclude === naat.$id}
          className={`rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            naat.exclude
              ? "border border-emerald-400/20 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/22"
              : "border border-red-400/20 bg-red-500/12 text-red-200 hover:bg-red-500/22"
          }`}
        >
          {updatingExclude === naat.$id ? "..." : naat.exclude ? "Include" : "Exclude"}
        </button>
        <button
          onClick={onToggleRadio}
          disabled={updatingRadio === naat.$id}
          className={`rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            naat.radio
              ? "border border-emerald-400/20 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/22"
              : "border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10"
          }`}
        >
          {updatingRadio === naat.$id ? "..." : naat.radio ? "Radio On" : "Radio Off"}
        </button>
        <button
          onClick={onToggleAiTrain}
          disabled={updatingAiTrain === naat.$id}
          className={`rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            naat.aiTrain
              ? "border border-fuchsia-400/20 bg-fuchsia-500/12 text-fuchsia-200 hover:bg-fuchsia-500/22"
              : "border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10"
          }`}
        >
          {updatingAiTrain === naat.$id ? "..." : naat.aiTrain ? "AI Train On" : "AI Train Off"}
        </button>
        <button
          onClick={onViewStatus}
          className="col-span-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-neutral-100 transition hover:bg-white/10"
          title="View DB document status"
        >
          View DB Status
        </button>
      </div>
    </article>
  );
}
