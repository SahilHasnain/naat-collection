"use client";

import { useRef } from "react";
import { CutSegment, DetectionResult, Naat } from "./types";
import AiDetectionPanel from "./AiDetectionPanel";

const YT_ICON = "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z";

interface Props {
  naat: Naat;
  cutSegments: CutSegment[];
  saving: boolean;
  skipping: boolean;
  draggedIndex: number | null;
  detecting: boolean;
  detectionResult: DetectionResult | null;
  onBack: () => void;
  onAddSegment: () => void;
  onRemoveSegment: (i: number) => void;
  onUpdateSegmentTime: (i: number, field: "start" | "end", min: number, sec: number) => void;
  onDragStart: (e: React.DragEvent, i: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, i: number) => void;
  onSave: () => void;
  onSkip: () => void;
  onDetect: () => void;
  onApplyDetected: () => void;
  getMinutes: (s: number) => number;
  getSeconds: (s: number) => number;
}

export default function CutEditorView({
  naat, cutSegments, saving, skipping, draggedIndex,
  detecting, detectionResult,
  onBack, onAddSegment, onRemoveSegment, onUpdateSegmentTime,
  onDragStart, onDragOver, onDrop,
  onSave, onSkip, onDetect, onApplyDetected,
  getMinutes, getSeconds,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function seekAudio(seconds: number) {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration || 0),
      );
    }
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-gray-400 transition-colors hover:text-white">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to list
      </button>

      {/* Naat header */}
      <div className="p-6 mb-6 bg-gray-800 rounded-lg">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-48 h-32 overflow-hidden bg-gray-700 rounded-lg">
            <img
              src={`https://img.youtube.com/vi/${naat.youtubeId}/mqdefault.jpg`}
              alt={naat.title}
              className="object-cover w-full h-full"
              onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${naat.youtubeId}/default.jpg`; }}
            />
          </div>
          <div className="flex-1">
            <h2 className="mb-2 text-2xl font-semibold">{naat.title}</h2>
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={YT_ICON} /></svg>
              <span>{naat.youtubeId}</span>
            </div>
            {naat.cutSegments ? (
              <div className="flex items-center gap-2 p-3 mb-2 border border-blue-700 rounded-lg bg-blue-900/30">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-sm text-blue-300">
                  <span className="font-semibold">Editing Mode:</span> This naat already has timestamps. You can modify them below.
                </p>
              </div>
            ) : (
              <p className="text-sm text-yellow-400">
                💡 If this naat has no explanation parts, click &quot;Skip - No Explanation&quot; below
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Audio player */}
      <div className="p-6 mb-6 bg-gray-800 rounded-lg">
        <h2 className="mb-4 text-xl font-semibold">Original Audio</h2>
        <audio
          ref={audioRef}
          controls
          className="w-full mb-3"
          src={`/api/stream-audio?audioId=${naat.audioId}`}
        />
        <div className="flex justify-center gap-2">
          <button onClick={() => seekAudio(-10)}
            className="flex items-center gap-2 px-4 py-2 font-medium transition-colors bg-gray-700 rounded hover:bg-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
            -10s
          </button>
          <button onClick={() => seekAudio(10)}
            className="flex items-center gap-2 px-4 py-2 font-medium transition-colors bg-gray-700 rounded hover:bg-gray-600">
            +10s
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cut segments */}
      <div className="p-6 mb-6 bg-gray-800 rounded-lg">
        <h2 className="mb-4 text-xl font-semibold">Cut Segments (Parts to Remove)</h2>
        <p className="mb-4 text-sm text-gray-400">Enter the start and end times for the explanation parts you want to remove</p>

        <button onClick={onAddSegment} className="px-4 py-2 mb-4 bg-blue-600 rounded hover:bg-blue-700">
          + Add Segment at Top
        </button>

        {[...cutSegments].reverse().map((segment, reversedIndex) => {
          const index = cutSegments.length - 1 - reversedIndex;
          return (
            <div
              key={index}
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, index)}
              className={`p-4 mb-4 bg-gray-700 rounded-lg cursor-move transition-colors ${draggedIndex === index ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                  <h4 className="text-sm font-medium text-gray-300">Segment {index + 1} (drag to reorder)</h4>
                </div>
                <button onClick={() => onRemoveSegment(index)} disabled={cutSegments.length === 1}
                  className="px-3 py-1 text-xs bg-red-600 rounded hover:bg-red-700 disabled:opacity-50">
                  Remove
                </button>
              </div>

              <div className="flex items-end gap-6">
                {(["start", "end"] as const).map((field) => (
                  <div key={field} className="flex-1">
                    <label className="block mb-2 text-sm font-medium capitalize">{field} Time</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block mb-1 text-xs text-gray-400">Minutes</label>
                        <input type="text" inputMode="numeric"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded"
                          value={getMinutes(segment[field])}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/\D/g, "")) || 0;
                            onUpdateSegmentTime(index, field, val, getSeconds(segment[field]));
                          }}
                        />
                      </div>
                      <span className="pb-2 text-2xl">:</span>
                      <div className="flex-1">
                        <label className="block mb-1 text-xs text-gray-400">Seconds</label>
                        <input type="text" inputMode="numeric"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded"
                          value={getSeconds(segment[field])}
                          onChange={(e) => {
                            const val = Math.min(parseInt(e.target.value.replace(/\D/g, "")) || 0, 59);
                            onUpdateSegmentTime(index, field, getMinutes(segment[field]), val);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => onRemoveSegment(index)} disabled={cutSegments.length === 1}
                  className="h-10 px-4 py-2 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50">
                  Remove
                </button>
              </div>
            </div>
          );
        })}

        <div className="flex gap-4 mt-4">
          <button onClick={onSave} disabled={saving}
            className="flex-1 px-6 py-3 font-semibold bg-green-600 rounded hover:bg-green-700 disabled:opacity-50">
            {saving ? "Saving..." : naat.cutSegments ? "💾 Update Timestamps" : "💾 Save Timestamps"}
          </button>
          <button onClick={onSkip} disabled={skipping}
            className="flex-1 px-6 py-3 font-semibold bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50">
            {skipping ? "Skipping..." : "Skip - No Explanation"}
          </button>
        </div>
      </div>

      <AiDetectionPanel
        detecting={detecting}
        detectionResult={detectionResult}
        onDetect={onDetect}
        onApply={onApplyDetected}
      />
    </div>
  );
}
