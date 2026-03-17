"use client";

import { DetectionResult } from "./types";

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

interface Props {
  detecting: boolean;
  detectionResult: DetectionResult | null;
  onDetect: () => void;
  onApply: () => void;
}

export default function AiDetectionPanel({ detecting, detectionResult, onDetect, onApply }: Props) {
  return (
    <div className="p-6 mb-6 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">AI Segment Detection</h2>
          <p className="mt-1 text-sm text-gray-400">
            Automatically detect explanation vs naat segments using audio analysis
          </p>
        </div>
        <button onClick={onDetect} disabled={detecting}
          className="flex items-center gap-2 px-6 py-3 font-semibold transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
          {detecting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : <>🤗 AI Detect</>}
        </button>
      </div>

      {detecting && (
        <div className="p-4 border border-purple-700 rounded-lg bg-purple-900/30">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="font-medium text-purple-300">Analyzing audio...</p>
              <p className="text-sm text-gray-400">Running Wav2Vec2 model to detect speech vs singing</p>
            </div>
          </div>
        </div>
      )}

      {detectionResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 text-center bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-400">Total Duration</p>
              <p className="text-lg font-bold">{fmt(detectionResult.duration)}</p>
            </div>
            <div className="p-3 text-center border border-red-700 rounded-lg bg-red-900/30">
              <p className="text-xs text-gray-400">Speech (to cut)</p>
              <p className="text-lg font-bold text-red-400">{fmt(detectionResult.totalSpeechDuration)}</p>
            </div>
            <div className="p-3 text-center border border-green-700 rounded-lg bg-green-900/30">
              <p className="text-xs text-gray-400">Naat (to keep)</p>
              <p className="text-lg font-bold text-green-400">{fmt(detectionResult.totalSingingDuration)}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Timeline</p>
            <div className="relative h-10 overflow-hidden bg-gray-700 rounded-lg">
              {detectionResult.allSegments.map((seg, i) => (
                <div
                  key={i}
                  className={`absolute top-0 h-full border-x ${seg.type === "speech" ? "bg-red-500/60 border-red-400" : "bg-green-500/60 border-green-400"}`}
                  style={{ left: `${(seg.start / detectionResult.duration) * 100}%`, width: `${Math.max(((seg.end - seg.start) / detectionResult.duration) * 100, 0.5)}%` }}
                  title={`${seg.type}: ${fmt(seg.start)} - ${fmt(seg.end)} (${Math.round(seg.confidence * 100)}%)`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>0:00</span>
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-500/60" /> Speech</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-500/60" /> Naat</span>
              </span>
              <span>{fmt(detectionResult.duration)}</span>
            </div>
          </div>

          {detectionResult.speechSegments.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">
                Detected Explanation Segments ({detectionResult.speechSegments.length})
              </p>
              <div className="space-y-2">
                {detectionResult.speechSegments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2 border border-red-800 rounded-lg bg-red-900/20">
                    <span className="font-mono text-sm text-red-400">{fmt(seg.start)} → {fmt(seg.end)}</span>
                    <span className="text-sm text-gray-400">({seg.duration}s)</span>
                    <span className="text-xs text-gray-500">{Math.round(seg.confidence * 100)}% confident</span>
                  </div>
                ))}
              </div>
              <button onClick={onApply} className="w-full px-6 py-3 mt-4 font-semibold transition-colors bg-purple-600 rounded-lg hover:bg-purple-700">
                Apply Detected Segments as Cut Points
              </button>
            </div>
          ) : (
            <div className="p-4 text-center border border-green-800 rounded-lg bg-green-900/20">
              <p className="font-medium text-green-400">No explanation segments detected</p>
              <p className="mt-1 text-sm text-gray-400">
                This naat appears to have no spoken explanations — consider using &quot;Skip - No Explanation&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
