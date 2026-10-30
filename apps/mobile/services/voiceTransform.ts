import {
  Client,
  Databases,
  ExecutionMethod,
  Functions,
  Query,
  type Models,
} from "react-native-appwrite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { appwriteConfig } from "@/config/appwrite";

export type VoicePreset = "subtle" | "younger" | "high";

interface VoiceJob extends Models.Document {
  status: "pending" | "running" | "done" | "failed";
  progress?: number;
  outputAudioId?: string;
  error?: string;
  audioId?: string;
  voicePreset?: VoicePreset;
}

const FUNCTION_ID = "create-voice-transform-job";
const JOBS_COLLECTION_ID = "ai_jobs";
const POLL_INTERVAL_MS = 2000;
const PENDING_JOB_PREFIX = "voice-transform-job:";
const READY_LOOKUP_PAGE_SIZE = 500;
const READY_CACHE_TTL_MS = 5 * 60 * 1000;

let readyAudioIdsCache: {
  voicePreset: VoicePreset;
  ids: Set<string>;
  fetchedAt: number;
} | null = null;
let readyAudioIdsInFlight: {
  voicePreset: VoicePreset;
  promise: Promise<Set<string>>;
} | null = null;

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);
const functions = new Functions(client);
const databases = new Databases(client);

export function getVoiceUrl(fileId: string): string {
  return `${appwriteConfig.endpoint}/storage/buckets/audio-files/files/${fileId}/view?project=${appwriteConfig.projectId}`;
}

async function waitForJob(jobId: string, onProgress?: (progress: number) => void): Promise<VoiceJob> {
  return new Promise<VoiceJob>((resolve, reject) => {
    let settled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const finish = (error?: Error, job?: VoiceJob) => {
      if (settled) return;
      settled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (error) reject(error);
      else if (job) resolve(job);
    };

    const inspect = (job: VoiceJob) => {
      if (typeof job.progress === "number") onProgress?.(job.progress);
      if (job.status === "done" || job.status === "failed") finish(undefined, job);
    };

    const fetchCurrentJob = async () => {
      try {
        const job = await databases.getDocument<VoiceJob>(
          appwriteConfig.databaseId,
          JOBS_COLLECTION_ID,
          jobId,
        );
        inspect(job);
      } catch (error) {
        console.warn("[VoiceTransform] Job status check failed; retrying", error);
      }
    };

    pollTimer = setInterval(() => {
      void fetchCurrentJob();
    }, POLL_INTERVAL_MS);
    void fetchCurrentJob();
  });
}

export type VoiceTransformJob = VoiceJob;

function pendingJobKey(audioId: string, voicePreset: VoicePreset): string {
  return `${PENDING_JOB_PREFIX}${audioId}:${voicePreset}`;
}

export async function startVoiceTransform(audioId: string, voicePreset: VoicePreset) {
  const execution = await functions.createExecution({
    functionId: FUNCTION_ID,
    body: JSON.stringify({ audioId, voicePreset }),
    async: false,
    method: ExecutionMethod.POST,
  });
  const response = JSON.parse(execution.responseBody || "{}");
  if (!response.ok || !response.jobId) throw new Error(response.error || "Unable to start voice transformation");
  await AsyncStorage.setItem(pendingJobKey(audioId, voicePreset), JSON.stringify({ jobId: response.jobId, voicePreset }));
  return databases.getDocument<VoiceTransformJob>(appwriteConfig.databaseId, JOBS_COLLECTION_ID, response.jobId);
}

export async function getPendingVoiceTransform(audioId: string) {
  const key = (await AsyncStorage.getAllKeys()).find((value) => value.startsWith(`${PENDING_JOB_PREFIX}${audioId}:`));
  if (!key) return null;
  const value = await AsyncStorage.getItem(key);
  return value ? { key, ...(JSON.parse(value) as { jobId: string; voicePreset: VoicePreset }) } : null;
}

export async function clearPendingVoiceTransform(key: string) { await AsyncStorage.removeItem(key); }

export function watchVoiceTransform(jobId: string, onUpdate: (job: VoiceTransformJob) => void): () => void {
  let stopped = false;
  const inspect = async () => {
    try {
      const job = await databases.getDocument<VoiceTransformJob>(appwriteConfig.databaseId, JOBS_COLLECTION_ID, jobId);
      if (!stopped) onUpdate(job);
    } catch (error) { console.warn("[VoiceTransform] Background job check failed; retrying", error); }
  };
  const timer = setInterval(() => void inspect(), POLL_INTERVAL_MS);
  void inspect();
  return () => { stopped = true; clearInterval(timer); };
}

export async function getExistingVoiceTransform(
  audioId: string,
  voicePreset: VoicePreset,
): Promise<{ audioId: string; audioUrl: string } | null> {
  try {
    const result = await databases.listDocuments<VoiceJob>(
      appwriteConfig.databaseId,
      JOBS_COLLECTION_ID,
      [
        Query.equal("status", "done"),
        Query.equal("audioId", audioId),
        Query.equal("voicePreset", voicePreset),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ],
    );

    const job = result.documents[0];
    if (job?.outputAudioId) {
      return {
        audioId: job.outputAudioId,
        audioUrl: getVoiceUrl(job.outputAudioId),
      };
    }
  } catch (error) {
    console.warn("[VoiceTransform] Failed to lookup existing voice transform", error);
  }

  return null;
}

/**
 * Drop the cached "already generated" audio IDs so the next lookup re-reads
 * `ai_jobs`. Call this after a voice transform finishes.
 */
export function invalidateReadyVoiceAudioIds(): void {
  readyAudioIdsCache = null;
}

/**
 * Return the source audio IDs that already have a completed voice transform
 * for the given preset. This mirrors the lookup used before playback, so any
 * naat in this set can use the generated voice immediately.
 */
export async function getReadyVoiceAudioIds(
  voicePreset: VoicePreset = "high",
  options: { forceRefresh?: boolean } = {},
): Promise<Set<string>> {
  const { forceRefresh = false } = options;
  const now = Date.now();

  if (
    !forceRefresh &&
    readyAudioIdsCache?.voicePreset === voicePreset &&
    now - readyAudioIdsCache.fetchedAt < READY_CACHE_TTL_MS
  ) {
    return readyAudioIdsCache.ids;
  }

  if (!forceRefresh && readyAudioIdsInFlight?.voicePreset === voicePreset) {
    return readyAudioIdsInFlight.promise;
  }

  const promise = (async () => {
    const ids = new Set<string>();
    let offset = 0;

    while (true) {
      const result = await databases.listDocuments<VoiceJob>(
        appwriteConfig.databaseId,
        JOBS_COLLECTION_ID,
        [
          Query.equal("type", "voice-transform"),
          Query.equal("status", "done"),
          Query.equal("voicePreset", voicePreset),
          Query.isNotNull("outputAudioId"),
          Query.select(["audioId"]),
          Query.orderAsc("$createdAt"),
          Query.limit(READY_LOOKUP_PAGE_SIZE),
          Query.offset(offset),
        ],
      );

      for (const job of result.documents) {
        if (job.audioId) ids.add(job.audioId);
      }

      offset += result.documents.length;
      if (result.documents.length < READY_LOOKUP_PAGE_SIZE) break;
    }

    return ids;
  })();

  readyAudioIdsInFlight = { voicePreset, promise };

  try {
    const ids = await promise;
    readyAudioIdsCache = { voicePreset, ids, fetchedAt: Date.now() };
    return ids;
  } finally {
    if (readyAudioIdsInFlight?.promise === promise) {
      readyAudioIdsInFlight = null;
    }
  }
}

export async function transformVoice(
  audioId: string,
  voicePreset: VoicePreset,
  onProgress?: (progress: number) => void,
): Promise<{ audioId: string; audioUrl: string }> {
  const existing = await getExistingVoiceTransform(audioId, voicePreset);
  if (existing) {
    onProgress?.(100);
    return existing;
  }

  const execution = await functions.createExecution({
    functionId: FUNCTION_ID,
    body: JSON.stringify({ audioId, voicePreset }),
    async: false,
    method: ExecutionMethod.POST,
  });

  const response = JSON.parse(execution.responseBody || "{}");
  if (!response.ok || !response.jobId) {
    throw new Error(response.error || "Unable to start voice transformation");
  }

  onProgress?.(5);
  const job = await waitForJob(response.jobId, onProgress);
  if (job.status !== "done" || !job.outputAudioId) {
    throw new Error(job.error || "Voice transformation failed");
  }

  return {
    audioId: job.outputAudioId,
    audioUrl: getVoiceUrl(job.outputAudioId),
  };
}
