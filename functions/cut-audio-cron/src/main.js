/**
 * Cut Audio Cron Function
 *
 * Finds naats that have cutSegments but no cutAudio yet (cutStatus is null or "failed"),
 * marks them as "processing", cuts the audio with ffmpeg, uploads the result,
 * and sets cutAudio + cutStatus = "done". On failure, sets cutStatus = "failed".
 *
 * cutStatus values: null (pending), "processing", "done", "failed"
 *
 * This prevents race conditions — concurrent runs skip naats already being processed.
 */

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { Client, Databases, ID, Permission, Query, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const BATCH_SIZE = 3;
const AUDIO_BUCKET = "audio-files";
const FADE_DURATION = 0.3;

// ── Helpers ───────────────────────────────────────────────────

function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration || 0);
    });
  });
}

function buildKeepSegments(cutSegments, audioDuration) {
  const sorted = [...cutSegments].sort((a, b) => a.start - b.start);
  const keep = [];
  let cursor = 0;

  for (const cut of sorted) {
    if (cursor < cut.start) {
      keep.push({ start: cursor, end: cut.start });
    }
    cursor = Math.max(cursor, cut.end);
  }

  if (cursor < audioDuration) {
    keep.push({ start: cursor, end: audioDuration });
  }

  return keep;
}

function cutAudio(inputPath, keepSegments, outputPath) {
  return new Promise((resolve, reject) => {
    if (keepSegments.length === 1) {
      const seg = keepSegments[0];
      const segDur = seg.end - seg.start;
      const fadeFilters = [];

      if (seg.start > 0) {
        fadeFilters.push(`afade=t=in:st=0:d=${FADE_DURATION}`);
      }
      fadeFilters.push(`afade=t=out:st=${Math.max(0, segDur - FADE_DURATION)}:d=${FADE_DURATION}`);

      const cmd = ffmpeg(inputPath)
        .setStartTime(seg.start)
        .setDuration(segDur)
        .audioCodec("aac")
        .audioBitrate("256k")
        .audioFrequency(44100)
        .audioChannels(2)
        .outputOptions(["-q:a", "2"]);

      if (fadeFilters.length > 0) cmd.audioFilters(fadeFilters);

      cmd.output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    } else {
      const filterComplex = [];

      keepSegments.forEach((seg, i) => {
        const segDur = seg.end - seg.start;
        const isFirst = i === 0;
        let fade = "";

        if (!isFirst || seg.start > 0) {
          fade += `afade=t=in:st=0:d=${FADE_DURATION}`;
        }
        const fadeOutStart = Math.max(0, segDur - FADE_DURATION);
        if (fade) fade += ",";
        fade += `afade=t=out:st=${fadeOutStart}:d=${FADE_DURATION}`;

        filterComplex.push(
          `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS,${fade}[a${i}]`
        );
      });

      const labels = keepSegments.map((_, i) => `[a${i}]`).join("");
      filterComplex.push(`${labels}concat=n=${keepSegments.length}:v=0:a=1[out]`);

      ffmpeg(inputPath)
        .complexFilter(filterComplex)
        .outputOptions(["-map", "[out]", "-c:a", "aac", "-b:a", "256k", "-ar", "44100", "-ac", "2", "-q:a", "2"])
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    }
  });
}

async function processNaat(naat, storage, databases, databaseId, collectionId, tmpDir, log) {
  const naatId = naat.$id;
  const inputPath = join(tmpDir, `${naatId}_original.mp4`);
  const outputPath = join(tmpDir, `${naatId}_cut.mp4`);

  // Mark as processing immediately
  await databases.updateDocument(databaseId, collectionId, naatId, {
    cutStatus: "processing",
  });

  try {
    let cutSegments;
    try {
      cutSegments = JSON.parse(naat.cutSegments);
    } catch {
      log(`  Skipping ${naatId}: invalid cutSegments JSON`);
      await databases.updateDocument(databaseId, collectionId, naatId, {
        cutStatus: "failed",
      });
      return false;
    }

    if (!Array.isArray(cutSegments) || cutSegments.length === 0) {
      // Empty array = no explanation, whole audio is naat
      await databases.updateDocument(databaseId, collectionId, naatId, {
        cutAudio: naat.audioId,
        cutStatus: "done",
      });
      log(`  ${naatId}: no cuts needed, linked original audio`);
      return true;
    }

    // Download original audio
    log(`  Downloading audio for ${naat.title || naatId}...`);
    const audioBuffer = await storage.getFileDownload(AUDIO_BUCKET, naat.audioId);
    writeFileSync(inputPath, Buffer.from(audioBuffer));

    const duration = await getAudioDuration(inputPath);
    const keepSegments = buildKeepSegments(cutSegments, duration);

    if (keepSegments.length === 0) {
      log(`  ${naatId}: no audio would remain after cuts`);
      await databases.updateDocument(databaseId, collectionId, naatId, {
        cutStatus: "failed",
      });
      return false;
    }

    log(`  Cutting audio (${keepSegments.length} segments to keep)...`);
    await cutAudio(inputPath, keepSegments, outputPath);

    log(`  Uploading cut audio...`);
    const fileId = ID.unique();
    const file = await storage.createFile(
      AUDIO_BUCKET,
      fileId,
      InputFile.fromPath(outputPath, `${naatId}_cut.mp4`),
      [Permission.read(Role.any())],
    );

    await databases.updateDocument(databaseId, collectionId, naatId, {
      cutAudio: file.$id,
      cutStatus: "done",
    });

    log(`  ✅ ${naatId}: cut audio saved as ${file.$id}`);
    return true;
  } catch (err) {
    // Mark as failed so next run can retry
    await databases.updateDocument(databaseId, collectionId, naatId, {
      cutStatus: "failed",
    });
    throw err;
  } finally {
    try { unlinkSync(inputPath); } catch { /* ignore */ }
    try { unlinkSync(outputPath); } catch { /* ignore */ }
  }
}

// ── Main ──────────────────────────────────────────────────────

export default async ({ res, log, error: logError }) => {
  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const storage = new Storage(client);

    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_NAATS_COLLECTION_ID;

    // Find naats with cutSegments but no cutAudio, where cutStatus is null or "failed"
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.isNotNull("cutSegments"),
      Query.isNull("cutAudio"),
      Query.isNotNull("audioId"),
      Query.or([
        Query.isNull("cutStatus"),
        Query.equal("cutStatus", "failed"),
      ]),
      Query.limit(BATCH_SIZE),
    ]);

    const naats = response.documents;
    log(`Found ${naats.length} naats to process`);

    if (naats.length === 0) {
      return res.json({ message: "No naats to process", processed: 0 });
    }

    const tmpDir = "/tmp/cut-audio";
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

    let processed = 0;
    let failed = 0;

    for (const naat of naats) {
      try {
        log(`Processing: ${naat.title || naat.$id}`);
        const success = await processNaat(naat, storage, databases, databaseId, collectionId, tmpDir, log);
        if (success) processed++;
        else failed++;
      } catch (err) {
        logError(`Failed to process ${naat.$id}: ${err.message}`);
        failed++;
      }
    }

    log(`Done: ${processed} processed, ${failed} failed`);
    return res.json({ processed, failed, total: naats.length });
  } catch (err) {
    logError(`Cut audio cron error: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
