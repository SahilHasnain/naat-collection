"use client";

import { useEffect, useMemo, useState } from "react";

type JobStatus = "all" | "pending" | "running" | "done" | "failed" | "stopped" | "stop_requested";

interface AiJob {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  type: string;
  status: string;
  progress: number;
  attempts: number;
  naatId: string;
  audioId: string;
  error: string;
  resultJson: string;
  naatTitle: string;
}

const statusStyles: Record<string, string> = {
  pending: "border-amber-400/20 bg-amber-500/12 text-amber-200",
  running: "border-sky-400/20 bg-sky-500/12 text-sky-200",
  done: "border-emerald-400/20 bg-emerald-500/12 text-emerald-200",
  failed: "border-red-400/20 bg-red-500/12 text-red-200",
  stopped: "border-neutral-400/20 bg-neutral-500/12 text-neutral-200",
  stop_requested: "border-orange-400/20 bg-orange-500/12 text-orange-200",
};

function formatDate(value: string) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

export default function AiJobsClient() {
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [status, setStatus] = useState<JobStatus>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actingJobId, setActingJobId] = useState<string | null>(null);
  const [clearingFinished, setClearingFinished] = useState(false);

  async function loadJobs(nextStatus: JobStatus = status, silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        status: nextStatus,
        limit: "100",
      });
      const response = await fetch(`/api/admin/ai-jobs?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load AI jobs");
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI jobs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadJobs(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function runJobAction(jobId: string, action: "stop" | "rerun") {
    setActingJobId(jobId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/ai-jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to ${action} job`);
      await loadJobs(status, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} job`);
    } finally {
      setActingJobId(null);
    }
  }

  async function clearFinishedJobs() {
    setClearingFinished(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/ai-jobs/clear-finished", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to clear finished jobs");
      await loadJobs(status, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear finished jobs");
    } finally {
      setClearingFinished(false);
    }
  }

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) =>
      [job.naatTitle, job.naatId, job.audioId, job.$id, job.error, job.status]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [jobs, search]);

  const counts = useMemo(() => {
    return jobs.reduce(
      (acc, job) => {
        acc.total += 1;
        if (job.status in acc) acc[job.status as keyof typeof acc] += 1;
        return acc;
      },
      { total: 0, pending: 0, running: 0, done: 0, failed: 0, stopped: 0, stop_requested: 0 },
    );
  }, [jobs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 p-8 text-white">
        <div className="mx-auto max-w-7xl">Loading AI jobs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,_#171717_0%,_#0a0a0a_100%)] p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-white/8 bg-white/[0.03] px-6 py-6 shadow-2xl backdrop-blur-sm md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/75">Admin Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">AI Jobs</h1>
          <p className="mt-3 text-sm text-neutral-400 md:text-base">
            Inspect manual cut detection jobs from the AI jobs collection, including live queue state and failures.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-red-100">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Total</p>
            <p className="mt-2 text-2xl font-semibold">{counts.total}</p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200/70">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-amber-200">{counts.pending}</p>
          </div>
          <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-200/70">Running</p>
            <p className="mt-2 text-2xl font-semibold text-sky-200">{counts.running}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">Done</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-200">{counts.done}</p>
          </div>
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-red-200/70">Failed</p>
            <p className="mt-2 text-2xl font-semibold text-red-200">{counts.failed}</p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, naat ID, audio ID, job ID, or error..."
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-sky-400/60 focus:outline-none"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as JobStatus)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="done">Done</option>
              <option value="failed">Failed</option>
              <option value="stopped">Stopped</option>
              <option value="stop_requested">Stop Requested</option>
            </select>
            <button
              onClick={() => loadJobs(status, true)}
              className="rounded-2xl border border-sky-400/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-500/22"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={clearFinishedJobs}
              disabled={clearingFinished || counts.done + counts.failed === 0}
              className="rounded-2xl border border-red-400/20 bg-red-500/12 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/22 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {clearingFinished ? "Clearing..." : `Clear Done + Failed (${counts.done + counts.failed})`}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <article key={job.$id} className="rounded-3xl border border-white/8 bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 p-5 shadow-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusStyles[job.status] || "border-white/10 bg-white/5 text-neutral-200"}`}>
                      {job.status}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
                      {job.type}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-400">
                      Attempts: {job.attempts}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-400">
                      Progress: {job.progress}%
                    </span>
                  </div>

                  <h2 className="mt-4 truncate text-lg font-semibold text-white">
                    {job.naatTitle || "Unknown naat"}
                  </h2>

                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-neutral-400 md:grid-cols-2">
                    <p><span className="text-neutral-500">Job ID:</span> <span className="font-mono text-neutral-300">{job.$id}</span></p>
                    <p><span className="text-neutral-500">Naat ID:</span> <span className="font-mono text-neutral-300">{job.naatId || "N/A"}</span></p>
                    <p><span className="text-neutral-500">Audio ID:</span> <span className="font-mono text-neutral-300">{job.audioId || "N/A"}</span></p>
                    <p><span className="text-neutral-500">Created:</span> <span className="text-neutral-300">{formatDate(job.$createdAt)}</span></p>
                    <p><span className="text-neutral-500">Updated:</span> <span className="text-neutral-300">{formatDate(job.$updatedAt)}</span></p>
                  </div>

                  {job.error && (
                    <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-950/30 px-4 py-3 text-sm text-red-100">
                      {job.error}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 md:w-44 md:flex-col">
                  <button
                    onClick={() => runJobAction(job.$id, "stop")}
                    disabled={actingJobId === job.$id || !["pending", "running"].includes(job.status)}
                    className="rounded-2xl border border-orange-400/20 bg-orange-500/12 px-4 py-2.5 text-sm font-medium text-orange-100 transition hover:bg-orange-500/22 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actingJobId === job.$id ? "Working..." : job.status === "running" ? "Stop" : "Cancel Queue"}
                  </button>
                  <button
                    onClick={() => runJobAction(job.$id, "rerun")}
                    disabled={actingJobId === job.$id || ["pending", "running", "stop_requested"].includes(job.status)}
                    className="rounded-2xl border border-emerald-400/20 bg-emerald-500/12 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/22 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actingJobId === job.$id ? "Working..." : "Rerun"}
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filteredJobs.length === 0 && (
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-6 py-12 text-center text-neutral-400">
              No jobs match the current filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
