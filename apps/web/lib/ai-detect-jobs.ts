import { DetectionResult } from "@/components/admin/manual-cut/types";

export type JobStatus = "pending" | "running" | "done" | "failed";

export interface Job {
  id: string;
  naatId: string;
  status: JobStatus;
  result?: DetectionResult;
  error?: string;
  createdAt: number;
}

// In-memory store — survives for the lifetime of the Next.js dev server process
const jobs = new Map<string, Job>();

export function createJob(naatId: string): Job {
  const id = `${naatId}-${Date.now()}`;
  const job: Job = { id, naatId, status: "pending", createdAt: Date.now() };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<Job>) {
  const job = jobs.get(id);
  if (job) jobs.set(id, { ...job, ...patch });
}

// Clean up jobs older than 1 hour
export function pruneOldJobs() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}
