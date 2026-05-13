/**
 * Fix Inconsistent Cut Status
 * 
 * Finds naats where cutStatus="done" but cutAudio is NULL
 * and resets cutStatus to NULL so they can be reprocessed
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

async function fixInconsistentStatus() {
  console.log("🔧 Fixing Inconsistent Cut Status\n");
  console.log("Finding naats with cutStatus='done' but cutAudio=NULL...\n");

  try {
    let totalFixed = 0;
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    const inconsistentNaats = [];

    // First, find all inconsistent naats
    while (hasMore) {
      const response = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_NAATS_COLLECTION_ID,
        [
          Query.equal("cutStatus", "done"),
          Query.isNull("cutAudio"),
          Query.limit(limit),
          Query.offset(offset),
        ]
      );

      console.log(
        `Batch ${Math.floor(offset / limit) + 1}: Found ${response.documents.length} inconsistent naats`
      );

      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      inconsistentNaats.push(...response.documents);

      if (response.documents.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    console.log(`\n📊 Total inconsistent naats found: ${inconsistentNaats.length}\n`);

    if (inconsistentNaats.length === 0) {
      console.log("✅ No inconsistent naats found. Database is clean!\n");
      return;
    }

    console.log("=" .repeat(70));
    console.log("🔄 Starting to fix inconsistent naats...");
    console.log("=" .repeat(70) + "\n");

    // Now fix them
    for (let i = 0; i < inconsistentNaats.length; i++) {
      const naat = inconsistentNaats[i];
      
      console.log(`[${i + 1}/${inconsistentNaats.length}] ${naat.title || naat.$id}`);
      console.log(`  ID: ${naat.$id}`);
      console.log(`  cutStatus: ${naat.cutStatus} → NULL`);
      console.log(`  cutAudio: ${naat.cutAudio}`);
      console.log(`  cutSegments: ${naat.cutSegments ? (typeof naat.cutSegments === 'string' ? naat.cutSegments.substring(0, 50) : JSON.stringify(naat.cutSegments).substring(0, 50)) : 'null'}...`);

      try {
        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_NAATS_COLLECTION_ID,
          naat.$id,
          { cutStatus: null }
        );

        console.log(`  ✅ Fixed\n`);
        totalFixed++;
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}\n`);
      }
    }

    console.log("=" .repeat(70));
    console.log("📊 SUMMARY");
    console.log("=" .repeat(70));
    console.log(`Total inconsistent naats: ${inconsistentNaats.length}`);
    console.log(`Successfully fixed: ${totalFixed}`);
    console.log(`Failed: ${inconsistentNaats.length - totalFixed}`);
    console.log("=" .repeat(70) + "\n");

    console.log("✅ Done! These naats can now be processed by the cut-audio function.\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

fixInconsistentStatus();
