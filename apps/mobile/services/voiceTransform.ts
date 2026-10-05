import {
  Client,
  Databases,
  ExecutionMethod,
  Functions,
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
}

const FUNCTION_ID = "create-voice-transform-job";
const JOBS_COLLECTION_ID = "ai_jobs";
const POLL_INTERVAL_MS = 2000;
const PENDING_JOB_PREFIX = "voice-transform-job:";

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);
const functions = new Functions(client);
const databases = new Databases(client);

export function getVoiceUrl(fileId: string): string {
  return `${appwriteConfig.endpoint}/storage/buckets/audio-files/files/${fileId}/view?project=${appwriteConfig.projectId}`;
}

async function waitForJob(jobId: string, onProgress?: (progress: number) => void): Promise<VoiceJob> {
  const channel = `databases.${appwriteConfig.databaseId}.collections.${JOBS_COLLECTION_ID}.documents.${jobId}`;

  return new Promise<VoiceJob>((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const finish = (error?: Error, job?: VoiceJob) => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
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

    try {
      unsubscribe = client.subscribe(channel, (event) => {
        inspect(event.payload as VoiceJob);
      });
    } catch {
      // The polling fallback below still works when Realtime is unavailable.
    }

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
  const channel = `databases.${appwriteConfig.databaseId}.collections.${JOBS_COLLECTION_ID}.documents.${jobId}`;
  let stopped = false;
  const inspect = async () => {
    try {
      const job = await databases.getDocument<VoiceTransformJob>(appwriteConfig.databaseId, JOBS_COLLECTION_ID, jobId);
      if (!stopped) onUpdate(job);
    } catch (error) { console.warn("[VoiceTransform] Background job check failed; retrying", error); }
  };
  let unsubscribe: (() => void) | undefined;
  try { unsubscribe = client.subscribe(channel, (event) => !stopped && onUpdate(event.payload as VoiceTransformJob)); } catch {}
  const timer = setInterval(() => void inspect(), POLL_INTERVAL_MS);
  void inspect();
  return () => { stopped = true; unsubscribe?.(); clearInterval(timer); };
}

export async function transformVoice(
  audioId: string,
  voicePreset: VoicePreset,
  onProgress?: (progress: number) => void,
): Promise<{ audioId: string; audioUrl: string }> {
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
