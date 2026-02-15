/**
 * Delete Orphaned Audio Files
 *
 * This script deletes audio files that no longer have database records
 */

const { Client, Storage } = require("node-appwrite");
require("dotenv").config({ path: "apps/mobile/.env" });

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);
const audioBucketId = "audio-files";

// Audio IDs from the deleted naats
const audioIdsToDelete = [
  "6963b49f002c1e3ed46a",
  "6963b4d4003c9fc44bad",
  "6963b56a00110ff3a1a4",
  "6963b7a90022886c187b",
  "6963beb6001c475f7b1e",
  "6964abee0023edeec9e4",
  "69678b4c00308f3ef1c6",
  "698a48f3001daad3a16c",
  "698a4cd5002c7ad94af8",
  "698a8d27000537a84c71",
  "698a908b003a26315568",
  "698adb5c002e64ac2898",
  "698aed81001e950b668d",
  "698afcd000293a2a6549",
  "698b008a00100b057f83",
  "698b23d1001a0f3b5048",
  "698b2537001f8dba98cb",
  "698b29df00388927a315",
  "698b36050029d466e9b2",
  "698b59c2001830a1cfc2",
  "698b5a06000650a17132",
];

async function deleteOrphanedAudio() {
  try {
    console.log("🗑️  Deleting Orphaned Audio Files\n");
    console.log("================================\n");
    console.log(`Total audio files to delete: ${audioIdsToDelete.length}\n`);

    const results = {
      deleted: 0,
      notFound: 0,
      failed: 0,
    };

    for (let i = 0; i < audioIdsToDelete.length; i++) {
      const audioId = audioIdsToDelete[i];
      console.log(`[${i + 1}/${audioIdsToDelete.length}] Deleting: ${audioId}`);

      try {
        await storage.deleteFile(audioBucketId, audioId);
        console.log(`   ✅ Deleted successfully`);
        results.deleted++;
      } catch (error) {
        if (error.code === 404) {
          console.log(`   ⚠️  File not found (already deleted)`);
          results.notFound++;
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          results.failed++;
        }
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("\n================================");
    console.log("✅ CLEANUP COMPLETE!\n");
    console.log("📊 RESULTS:");
    console.log(`   Audio files deleted: ${results.deleted}`);
    console.log(`   Audio files not found: ${results.notFound}`);
    console.log(`   Deletion failed: ${results.failed}`);
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    process.exit(1);
  }
}

// Run cleanup
deleteOrphanedAudio();
