import {
  Client,
  Databases,
  ExecutionMethod,
  Functions,
  type Models,
} from "react-native-appwrite";
import { appwriteConfig } from "@/config/appwrite";

export type VoicePreset = "subtle" | "younger" | "high";

interface VoiceJob extends Models.Document {
  status: "pending" | "running" | "done" | "failed";
  outputAudioId?: string;
  error?: string;
}

const FUNCTION_ID = "create-voice-transform-job";
const JOBS_COLLECTION_ID = "ai_jobs";
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 45;

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);
const functions = new Functions(client);
const databases = new Databases(client);

function getAudioUrl(fileId: string): string {
  return `${appwriteConfig.endpoint}/storage/buckets/audio-files/files/${fileId}/view?project=${appwriteConfig.projectId}`;
}

async function waitForJob(jobId: string): Promise<VoiceJob> {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    const job = await databases.getDocument<VoiceJob>(
      appwriteConfig.databaseId,
      JOBS_COLLECTION_ID,
      jobId,
    );

    if (job.status === "done" || job.status === "failed") {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Voice transformation is taking longer than expected");
}

export async function transformVoice(
  audioId: string,
  voicePreset: VoicePreset,
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

  const job = await waitForJob(response.jobId);
  if (job.status !== "done" || !job.outputAudioId) {
    throw new Error(job.error || "Voice transformation failed");
  }

  return {
    audioId: job.outputAudioId,
    audioUrl: getAudioUrl(job.outputAudioId),
  };
}
