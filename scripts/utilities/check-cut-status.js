/**
 * Check cutStatus values to understand why cut-audio function finds no naats
 */

const { Client, Databases, Query } = require("node-appwrite");
const dotenv = require("dotenv");
const { join } = require("path");

dotenv.config({ path: join(__dirname, "../../apps/mobile/.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function checkCutStatus() {
  console.log("🔍 Checking cutStatus values\n");

  try {
    let stats = {
      total: 0,
      withAudioId: 0,
      withCutSegments: 0,
      withCutAudio: 0,
      cutStatusNull: 0,
      cutStatusDone: 0,
      cutStatusFailed: 0,
      cutStatusProcessing: 0,
      cutStatusOther: 0,
      // Eligible for processing
      eligibleForProcessing: 0,
    };

    const cutStatusValues = new Map();
    const eligibleExamples = [];

    let offset = 0;
    const limit = 100;
    let hasMore = true;

    console.log("Fetching naats from database...\n");

    while (hasMore) {
      const response = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_NAATS_COLLECTION_ID,
        [Query.limit(limit), Query.offset(offset)]
      );

      console.log(
        `Processing batch ${Math.floor(offset / limit) + 1}: ${response.documents.length} documents`
      );

      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      for (const naat of response.documents) {
        stats.total++;

        // Check fields
        const hasAudioId = naat.audioId !== null && naat.audioId !== undefined;
        const hasCutSegments = naat.cutSegments !== null && naat.cutSegments !== undefined;
        const hasCutAudio = naat.cutAudio !== null && naat.cutAudio !== undefined;

        if (hasAudioId) stats.withAudioId++;
        if (hasCutSegments) stats.withCutSegments++;
        if (hasCutAudio) stats.withCutAudio++;

        // Track cutStatus values
        const cutStatus = naat.cutStatus;
        const statusKey = cutStatus === null || cutStatus === undefined ? "null" : String(cutStatus);
        cutStatusValues.set(statusKey, (cutStatusValues.get(statusKey) || 0) + 1);

        if (cutStatus === null || cutStatus === undefined) {
          stats.cutStatusNull++;
        } else if (cutStatus === "done") {
          stats.cutStatusDone++;
        } else if (cutStatus === "failed") {
          stats.cutStatusFailed++;
        } else if (cutStatus === "processing") {
          stats.cutStatusProcessing++;
        } else {
          stats.cutStatusOther++;
        }

        // Check if eligible for processing (matches function query)
        const isEligible =
          hasCutSegments &&
          !hasCutAudio &&
          hasAudioId &&
          (cutStatus === null || cutStatus === undefined || cutStatus === "failed");

        if (isEligible) {
          stats.eligibleForProcessing++;
          if (eligibleExamples.length < 5) {
            eligibleExamples.push({
              id: naat.$id,
              title: naat.title,
              audioId: naat.audioId,
              cutSegments: typeof naat.cutSegments === 'string' ? naat.cutSegments.substring(0, 50) : JSON.stringify(naat.cutSegments).substring(0, 50),
              cutStatus: cutStatus,
            });
          }
        }
      }

      if (response.documents.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    // Print results
    console.log("\n" + "=".repeat(70));
    console.log("📊 CUT STATUS ANALYSIS");
    console.log("=".repeat(70) + "\n");

    console.log("📈 Overall:");
    console.log(`   Total Naats: ${stats.total}`);
    console.log(`   With audioId: ${stats.withAudioId} (${((stats.withAudioId / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   With cutSegments: ${stats.withCutSegments} (${((stats.withCutSegments / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   With cutAudio: ${stats.withCutAudio} (${((stats.withCutAudio / stats.total) * 100).toFixed(1)}%)`);

    console.log("\n📋 cutStatus Breakdown:");
    console.log(`   NULL: ${stats.cutStatusNull} (${((stats.cutStatusNull / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   "done": ${stats.cutStatusDone} (${((stats.cutStatusDone / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   "failed": ${stats.cutStatusFailed} (${((stats.cutStatusFailed / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   "processing": ${stats.cutStatusProcessing} (${((stats.cutStatusProcessing / stats.total) * 100).toFixed(1)}%)`);
    if (stats.cutStatusOther > 0) {
      console.log(`   Other: ${stats.cutStatusOther} (${((stats.cutStatusOther / stats.total) * 100).toFixed(1)}%)`);
    }

    console.log("\n📊 All cutStatus values found:");
    const sortedStatuses = Array.from(cutStatusValues.entries()).sort((a, b) => b[1] - a[1]);
    sortedStatuses.forEach(([status, count]) => {
      console.log(`   "${status}": ${count}`);
    });

    console.log("\n" + "=".repeat(70));
    console.log("🎯 ELIGIBLE FOR PROCESSING");
    console.log("=".repeat(70));
    console.log(`\nTotal eligible: ${stats.eligibleForProcessing}`);
    console.log("\nCriteria:");
    console.log("  ✓ cutSegments NOT NULL");
    console.log("  ✓ cutAudio IS NULL");
    console.log("  ✓ audioId NOT NULL");
    console.log("  ✓ cutStatus IS NULL or 'failed'");

    if (eligibleExamples.length > 0) {
      console.log("\n📝 Examples of eligible naats:");
      eligibleExamples.forEach((ex, i) => {
        console.log(`\n${i + 1}. ${ex.title}`);
        console.log(`   ID: ${ex.id}`);
        console.log(`   audioId: ${ex.audioId}`);
        console.log(`   cutSegments: ${ex.cutSegments}...`);
        console.log(`   cutStatus: ${ex.cutStatus}`);
      });
    } else {
      console.log("\n⚠️  No eligible naats found!");
    }

    console.log("\n" + "=".repeat(70));

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

checkCutStatus();
