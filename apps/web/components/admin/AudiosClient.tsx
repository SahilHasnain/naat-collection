"use client";

import { useEffect, useState } from "react";

interface AudioStats {
  totalNaats: number;
  withAudio: number;
  withoutAudio: number;
  withCutAudio: number;
  orphanedAudioFiles: number;
  brokenAudioReferences: number;
  sampleMissing: Array<{ $id: string; title: string; youtubeId: string; channelName: string }>;
}

function parseSseChunk(chunk: string) {
  return chunk
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => {
      try {
        return JSON.parse(line.slice(6)) as { type: string; message?: string; code?: number };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as { type: string; message?: string; code?: number }[];
}

export default function AudiosClient() {
  const [stats, setStats] = useState<AudioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [cleaningOrphaned, setCleaningOrphaned] = useState(false);
  const [repairingBrokenRefs, setRepairingBrokenRefs] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [limit, setLimit] = useState(10);
  const [logs, setLogs] = useState<string[]>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    void fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/audios/stats");
      const data = await response.json();
      setStats(data);
    } finally {
      setLoading(false);
    }
  }

  function addLog(message: string) {
    setLogs((current) => [...current, `[${new Date().toLocaleTimeString("en-IN")}] ${message}`]);
  }

  async function startAudioRun() {
    if (running) return;

    setRunning(true);
    setLogs([]);
    setExitCode(null);
    addLog("Starting audio batch...");

    try {
      const response = await fetch("/api/admin/audios/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: limitEnabled ? limit : null,
          testMode,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to start audio batch (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          for (const event of parseSseChunk(part)) {
            if (event.type === "log" && event.message) addLog(event.message);
            if (event.type === "complete") {
              setExitCode(event.code ?? 0);
              addLog(`Audio batch finished with exit code ${event.code ?? 0}.`);
            }
          }
        }
      }

      await fetchStats();
    } catch (error) {
      addLog(error instanceof Error ? error.message : "Audio batch failed");
      setExitCode(1);
    } finally {
      setRunning(false);
    }
  }

  async function cleanupOrphanedAudio() {
    if (cleaningOrphaned || running) return;
    const confirmed = window.confirm("Delete orphaned audio files from storage?");
    if (!confirmed) return;

    setCleaningOrphaned(true);
    addLog("Starting orphaned audio cleanup...");

    try {
      const response = await fetch("/api/admin/audios/cleanup-orphaned", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cleanup orphaned audio");
      }

      addLog(`Orphaned audio cleanup complete: ${data.deletedCount} files deleted.`);
      await fetchStats();
    } catch (error) {
      addLog(error instanceof Error ? error.message : "Orphaned audio cleanup failed");
    } finally {
      setCleaningOrphaned(false);
    }
  }

  async function repairBrokenReferences() {
    if (repairingBrokenRefs || running || cleaningOrphaned) return;
    const confirmed = window.confirm(
      "Clear stale audioId and cutAudio values whose files are already missing from storage?"
    );
    if (!confirmed) return;

    setRepairingBrokenRefs(true);
    addLog("Starting broken audio reference repair...");

    try {
      const response = await fetch("/api/admin/audios/repair-broken-references", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to repair broken audio references");
      }

      addLog(`Broken reference repair complete: ${data.updatedCount} naats updated.`);
      await fetchStats();
    } catch (error) {
      addLog(error instanceof Error ? error.message : "Broken reference repair failed");
    } finally {
      setRepairingBrokenRefs(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Audios</h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            Inspect audio coverage and run the existing `scripts/utilities/download-audio.js` batch job with live streamed logs.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={repairBrokenReferences}
            disabled={repairingBrokenRefs || cleaningOrphaned || running}
            className="rounded-full border border-amber-400/25 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-amber-200 transition hover:border-amber-300/40 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {repairingBrokenRefs ? "Repairing Broken..." : "Repair Broken Refs"}
          </button>
          <button
            type="button"
            onClick={cleanupOrphanedAudio}
            disabled={cleaningOrphaned || running || repairingBrokenRefs}
            className="rounded-full border border-red-400/25 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-200 transition hover:border-red-300/40 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cleaningOrphaned ? "Cleaning Orphaned..." : "Cleanup Orphaned"}
          </button>
          <button
            type="button"
            onClick={startAudioRun}
            disabled={running || cleaningOrphaned || repairingBrokenRefs}
            className="rounded-full border border-sky-400/30 bg-sky-500/15 px-5 py-2.5 text-sm font-medium text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "Running..." : testMode ? "Start Test Batch" : "Start Audio Batch"}
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-6">
        <StatCard label="Total Naats" value={stats?.totalNaats} tone="text-white" />
        <StatCard label="With Audio" value={stats?.withAudio} tone="text-sky-300" />
        <StatCard label="Missing Audio" value={stats?.withoutAudio} tone="text-amber-300" />
        <StatCard label="Cut Audio" value={stats?.withCutAudio} tone="text-emerald-300" />
        <StatCard label="Orphaned Files" value={stats?.orphanedAudioFiles} tone="text-red-300" />
        <StatCard label="Broken Refs" value={stats?.brokenAudioReferences} tone="text-amber-200" />
      </div>

      <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Batch Configuration</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300">
            <input type="checkbox" checked={testMode} onChange={(event) => setTestMode(event.target.checked)} className="h-4 w-4" />
            Test mode only, do not upload or update database
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300">
            <input type="checkbox" checked={limitEnabled} onChange={(event) => setLimitEnabled(event.target.checked)} className="h-4 w-4" />
            Limit processed naats
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-neutral-400">Limit</span>
          <input
            type="number"
            min="1"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value) || 1)}
            disabled={!limitEnabled}
            className="w-28 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
          />
          <span className={`text-sm ${exitCode === null ? "text-neutral-500" : exitCode === 0 ? "text-emerald-300" : "text-red-300"}`}>
            Last exit: {exitCode === null ? "-" : exitCode}
          </span>
        </div>
      </div>

      <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Missing Audio Sample</h2>
        {loading ? (
          <div className="text-sm text-neutral-400">Loading audio coverage...</div>
        ) : stats?.sampleMissing.length ? (
          <div className="space-y-3">
            {stats.sampleMissing.map((naat) => (
              <div key={naat.$id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="font-medium text-white">{naat.title}</div>
                <div className="mt-1 text-sm text-neutral-400">{naat.channelName}</div>
                <div className="mt-1 font-mono text-xs text-neutral-500">{naat.youtubeId}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-neutral-500">No missing-audio naats found.</div>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Live Log</h2>
        <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950 p-4 font-mono text-xs text-neutral-300">
          {logs.length === 0 ? <div className="text-neutral-500">Run an audio batch to stream logs here.</div> : logs.map((log, index) => <div key={`${index}-${log}`}>{log}</div>)}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value?: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${tone}`}>{typeof value === "number" ? value.toLocaleString() : "-"}</div>
    </div>
  );
}
