const sdk = require("node-appwrite");

const ALLOWED_PRESETS = {
  subtle: 2,
  younger: 4,
  high: 6,
};

module.exports = async ({ req, res, log, error }) => {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const audioId = typeof body.audioId === "string" ? body.audioId.trim() : "";
    const voicePreset = body.voicePreset || "younger";

    if (!audioId || !ALLOWED_PRESETS[voicePreset]) {
      return res.json({ ok: false, error: "audioId and a valid voicePreset are required" }, 400);
    }

    const client = new sdk.Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY);
    const databases = new sdk.Databases(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_AI_JOBS_COLLECTION_ID || "ai_jobs";
    const existingJobs = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.equal("type", "voice-transform"),
      sdk.Query.equal("audioId", audioId),
      sdk.Query.equal("voicePreset", voicePreset),
      sdk.Query.orderDesc("$createdAt"),
      sdk.Query.limit(10),
    ]);
    const reusableJob = existingJobs.documents.find((candidate) =>
      ["pending", "running"].includes(candidate.status) ||
      (candidate.status === "done" && candidate.outputAudioId),
    );

    if (reusableJob) {
      const response = {
        ok: true,
        jobId: reusableJob.$id,
        voicePreset,
        reused: true,
      };
      if (reusableJob.status === "done") {
        response.outputAudioId = reusableJob.outputAudioId;
      }
      log(`Reusing voice transform ${reusableJob.$id} for ${audioId}`);
      return res.json(response);
    }

    const job = await databases.createDocument(
      databaseId,
      collectionId,
      sdk.ID.unique(),
      {
        type: "voice-transform",
        status: "pending",
        // ai_jobs historically requires naatId; audioId is the target for this job.
        naatId: body.naatId || audioId,
        audioId,
        voicePreset,
        pitchSemitones: ALLOWED_PRESETS[voicePreset],
        progress: 0,
        attempts: 0,
        error: "",
      },
    );

    log(`Queued voice transform ${job.$id} for ${audioId}`);
    return res.json({ ok: true, jobId: job.$id, voicePreset });
  } catch (caught) {
    error(caught);
    return res.json({ ok: false, error: "Unable to queue voice transform" }, 500);
  }
};
