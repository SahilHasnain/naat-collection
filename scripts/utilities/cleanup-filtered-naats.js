/**
 * Cleanup Filtered Naats
 *
 * This script removes naats that no longer match the new filter criteria
 * and deletes their associated audio files from storage.
 *
 * Filters applied:
 * - Videos from non-official channels must contain "Owais Qadri"
 * - Videos from isOther channels must be less than 20 minutes (1200 seconds)
 */

const { Client, Databases, Storage, Query } = require("node-appwrite");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: "apps/mobile/.env" });

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);
const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const naatsCollectionId = process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID;
const audioBucketId = "audio-files"; // Hardcoded bucket ID

// New filter logic (must match ingestion function)
function shouldFilterOut(title, isOfficial) {
  // If channel is official, don't filter based on title
  if (isOfficial) {
    return false;
  }

  const titleLower = title.toLowerCase();

  // Only 'O' starting variations allowed
  const owaisVariations = ["owais", "owias", "owes", "owaiz", "ovais", "oveis"];

  const hasOwais = owaisVariations.some((owais) => titleLower.includes(owais));

  // Check if title contains "Qadri" (with common spelling variations)
  const qadriVariations = ["qadri", "qadiri", "qaadri", "qaadiri"];
  const hasQadri = qadriVariations.some((qadri) => titleLower.includes(qadri));

  // Must have Owais (O-starting) + Qadri
  const isOwaisQadriVideo = hasOwais && hasQadri;

  // Return true if should be filtered out
  return !isOwaisQadriVideo;
}

// Check if video should be filtered based on duration for isOther channels
function shouldFilterByDuration(duration, isOther) {
  // For isOther channels, filter videos longer than 20 minutes (1200 seconds)
  if (isOther && duration > 1200) {
    return true;
  }
  return false;
}

async function getAllNaatsWithChannelInfo() {
  const allNaats = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  console.log("📥 Fetching all naats from database...\n");

  while (hasMore) {
    const response = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [Query.limit(limit), Query.offset(offset)],
    );

    allNaats.push(...response.documents);
    offset += limit;
    hasMore = response.documents.length === limit;

    process.stdout.write(`\r   Fetched: ${allNaats.length} naats...`);
  }

  console.log(`\n✅ Total naats in database: ${allNaats.length}\n`);

  // Fetch channel information to get isOfficial and isOther flags
  console.log("📥 Fetching channel information...\n");

  const channelsResponse = await databases.listDocuments(
    databaseId,
    process.env.EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID,
    [Query.limit(5000)],
  );

  const channelsMap = new Map();
  channelsResponse.documents.forEach((channel) => {
    channelsMap.set(channel.channelId, {
      isOfficial: channel.isOfficial ?? true,
      isOther: channel.isOther ?? false,
      name: channel.channelName,
    });
  });

  console.log(`✅ Fetched ${channelsMap.size} channels\n`);

  // Attach channel info to naats
  const naatsWithChannelInfo = allNaats.map((naat) => {
    const channelInfo = channelsMap.get(naat.channelId) || {
      isOfficial: true,
      isOther: false,
      name: naat.channelName,
    };
    return {
      ...naat,
      isOfficial: channelInfo.isOfficial,
      isOther: channelInfo.isOther,
    };
  });

  return naatsWithChannelInfo;
}

async function deleteAudioFile(audioId, title) {
  if (!audioId) {
    console.log(`   ⚠️  No audio file ID for: ${title}`);
    return { success: false, reason: "no_audio_id" };
  }

  try {
    await storage.deleteFile(audioBucketId, audioId);
    console.log(`   ✅ Deleted audio file: ${audioId}`);
    return { success: true };
  } catch (error) {
    if (error.code === 404) {
      console.log(`   ⚠️  Audio file not found: ${audioId}`);
      return { success: false, reason: "not_found" };
    }
    console.log(`   ❌ Error deleting audio: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

async function deleteNaatDocument(naatId, title) {
  try {
    await databases.deleteDocument(databaseId, naatsCollectionId, naatId);
    console.log(`   ✅ Deleted database record: ${naatId}`);
    return { success: true };
  } catch (error) {
    console.log(`   ❌ Error deleting record: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

async function cleanupFilteredNaats(dryRun = true) {
  try {
    console.log("🧹 Cleanup Filtered Naats\n");
    console.log("================================\n");

    if (dryRun) {
      console.log("⚠️  DRY RUN MODE - No changes will be made\n");
    } else {
      console.log("🔴 LIVE MODE - Changes will be permanent!\n");
    }

    const allNaats = await getAllNaatsWithChannelInfo();

    // Find naats to remove based on filters
    const naatsToRemove = allNaats.filter((naat) => {
      // Filter by title (for non-official channels)
      const titleFiltered = shouldFilterOut(naat.title, naat.isOfficial);

      // Filter by duration (for isOther channels)
      const durationFiltered = shouldFilterByDuration(
        naat.duration,
        naat.isOther,
      );

      return titleFiltered || durationFiltered;
    });

    console.log("================================");
    console.log("📊 CLEANUP SUMMARY\n");
    console.log(`Total naats to remove: ${naatsToRemove.length}\n`);

    if (naatsToRemove.length === 0) {
      console.log("✅ No naats to remove!");
      return;
    }

    // Group by channel and reason
    const byChannel = {};
    const byReason = {
      titleFiltered: 0,
      durationFiltered: 0,
      both: 0,
    };

    naatsToRemove.forEach((naat) => {
      if (!byChannel[naat.channelName]) {
        byChannel[naat.channelName] = [];
      }
      byChannel[naat.channelName].push(naat);

      // Track reason
      const titleFiltered = shouldFilterOut(naat.title, naat.isOfficial);
      const durationFiltered = shouldFilterByDuration(
        naat.duration,
        naat.isOther,
      );

      if (titleFiltered && durationFiltered) {
        byReason.both++;
      } else if (titleFiltered) {
        byReason.titleFiltered++;
      } else if (durationFiltered) {
        byReason.durationFiltered++;
      }
    });

    console.log("📋 BREAKDOWN BY CHANNEL:\n");
    for (const [channel, naats] of Object.entries(byChannel)) {
      console.log(`   ${channel}: ${naats.length} naats`);
    }

    console.log("\n📋 BREAKDOWN BY REASON:\n");
    console.log(`   Title filtered (non-Owais): ${byReason.titleFiltered}`);
    console.log(
      `   Duration filtered (>20 min for isOther): ${byReason.durationFiltered}`,
    );
    console.log(`   Both filters: ${byReason.both}`);

    console.log("\n================================");
    console.log("📝 NAATS TO BE REMOVED:\n");

    naatsToRemove.forEach((naat, index) => {
      const titleFiltered = shouldFilterOut(naat.title, naat.isOfficial);
      const durationFiltered = shouldFilterByDuration(
        naat.duration,
        naat.isOther,
      );
      const reasons = [];
      if (titleFiltered) reasons.push("non-Owais");
      if (durationFiltered)
        reasons.push(`>${Math.floor(naat.duration / 60)}min`);

      console.log(`${index + 1}. ${naat.title}`);
      console.log(`   Channel: ${naat.channelName}`);
      console.log(
        `   Duration: ${Math.floor(naat.duration / 60)}:${String(naat.duration % 60).padStart(2, "0")}`,
      );
      console.log(`   Reason: ${reasons.join(", ")}`);
      console.log(`   ID: ${naat.$id}`);
      console.log(`   Audio ID: ${naat.audioId || "N/A"}`);
      console.log("");
    });

    if (dryRun) {
      console.log("================================");
      console.log("⚠️  DRY RUN COMPLETE - No changes made\n");
      console.log("To perform actual cleanup, run:");
      console.log(
        "   node scripts/utilities/cleanup-filtered-naats.js --live\n",
      );
      return;
    }

    // Perform actual cleanup
    console.log("================================");
    console.log("🔴 STARTING CLEANUP...\n");

    const results = {
      audioDeleted: 0,
      audioFailed: 0,
      audioNotFound: 0,
      audioNoId: 0,
      recordDeleted: 0,
      recordFailed: 0,
    };

    for (let i = 0; i < naatsToRemove.length; i++) {
      const naat = naatsToRemove[i];
      console.log(
        `\n[${i + 1}/${naatsToRemove.length}] Processing: ${naat.title}`,
      );

      // Delete audio file first
      const audioResult = await deleteAudioFile(naat.audioId, naat.title);
      if (audioResult.success) {
        results.audioDeleted++;
      } else if (audioResult.reason === "not_found") {
        results.audioNotFound++;
      } else if (audioResult.reason === "no_audio_id") {
        results.audioNoId++;
      } else {
        results.audioFailed++;
      }

      // Delete database record
      const recordResult = await deleteNaatDocument(naat.$id, naat.title);
      if (recordResult.success) {
        results.recordDeleted++;
      } else {
        results.recordFailed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("\n================================");
    console.log("✅ CLEANUP COMPLETE!\n");
    console.log("📊 RESULTS:");
    console.log(`   Audio files deleted: ${results.audioDeleted}`);
    console.log(`   Audio files not found: ${results.audioNotFound}`);
    console.log(`   Audio files without ID: ${results.audioNoId}`);
    console.log(`   Audio deletion failed: ${results.audioFailed}`);
    console.log(`   Database records deleted: ${results.recordDeleted}`);
    console.log(`   Database deletion failed: ${results.recordFailed}`);
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const isLiveMode = args.includes("--live");

// Run cleanup
cleanupFilteredNaats(!isLiveMode);
