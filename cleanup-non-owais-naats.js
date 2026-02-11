/**
 * Script to remove existing non-Owais naats from Baghdadi Sound and Media channel
 * Also deletes associated audio files from Appwrite Storage
 * WARNING: This will permanently delete documents and files from your database and storage!
 */

const { Client, Databases, Storage, Query } = require("node-appwrite");
const path = require("path");
const readline = require("readline");
require("dotenv").config({
  path: path.join(__dirname, "apps", "mobile", ".env.appwrite"),
});

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "")
  .setProject(process.env.APPWRITE_PROJECT_ID || "")
  .setKey(process.env.APPWRITE_API_KEY || "");

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "";
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID || "";
const AUDIO_BUCKET_ID = "audio-files";

/**
 * Ask user for confirmation before deletion
 */
function askConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

async function cleanupNonOwaisNaats() {
  try {
    console.log(
      "🧹 Starting cleanup of non-Owais naats from Baghdadi Sound and Media...\n",
    );

    // Fetch all naats
    let allNaats = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    console.log("📦 Fetching all documents from database...");
    while (hasMore) {
      const response = await databases.listDocuments(
        DATABASE_ID,
        NAATS_COLLECTION_ID,
        [Query.limit(limit), Query.offset(offset)],
      );

      allNaats = allNaats.concat(response.documents);
      offset += limit;
      hasMore = response.documents.length === limit;

      console.log(`   Fetched ${allNaats.length} documents so far...`);
    }

    console.log(`\n✅ Total documents fetched: ${allNaats.length}\n`);

    // Baghdadi Sound & Video channel ID
    const BAGHDADI_CHANNEL_ID = "UC-pKQ46ZSMkveYV7nKijWmQ";

    // Filter for Baghdadi Sound & Video channel by channel ID
    const baghdadiNaats = allNaats.filter(
      (naat) => naat.channelId === BAGHDADI_CHANNEL_ID,
    );

    console.log(
      `📺 Naats from Baghdadi Sound and Media: ${baghdadiNaats.length}\n`,
    );

    // Find non-Owais naats to delete (with spelling variations)
    const naatsToDelete = baghdadiNaats.filter((naat) => {
      const title = naat.title?.toLowerCase() || "";

      // Common spelling variations
      const owaisVariations = [
        "owais",
        "owias",
        "owes",
        "owaiz",
        "awais",
        "awaiz",
        "uwais",
        "uwaiz",
      ];
      const razaVariations = ["raza", "rza", "rezza", "reza"];
      const qadriVariations = [
        "qadri",
        "qadry",
        "qadiri",
        "qaadri",
        "kadri",
        "kadry",
      ];

      // Check if title contains any combination of Owais + Raza
      const hasOwaisRaza = owaisVariations.some((owais) =>
        razaVariations.some(
          (raza) => title.includes(owais) && title.includes(raza),
        ),
      );

      // Check if title contains any combination of Owais + Qadri
      const hasOwaisQadri = owaisVariations.some((owais) =>
        qadriVariations.some(
          (qadri) => title.includes(owais) && title.includes(qadri),
        ),
      );

      return !(hasOwaisRaza || hasOwaisQadri);
    });

    console.log("📊 CLEANUP PREVIEW:");
    console.log("═".repeat(60));
    console.log(
      `Total Baghdadi Sound and Media naats: ${baghdadiNaats.length}`,
    );
    console.log(`Naats to DELETE (non-Owais): ${naatsToDelete.length}`);
    console.log(
      `Naats to KEEP (Owais Raza/Qadri): ${baghdadiNaats.length - naatsToDelete.length}`,
    );
    const naatsWithAudio = naatsToDelete.filter((n) => n.audioId).length;
    console.log(`Naats with audio files: ${naatsWithAudio}`);
    console.log("═".repeat(60));

    if (naatsToDelete.length === 0) {
      console.log("\n✨ No non-Owais naats found. Nothing to delete!");
      return;
    }

    // Show sample of what will be deleted
    console.log("\n📝 Sample of naats that will be DELETED (first 10):");
    console.log("-".repeat(60));
    naatsToDelete.slice(0, 10).forEach((naat, index) => {
      console.log(`${index + 1}. ${naat.title}`);
      console.log(`   ID: ${naat.$id}\n`);
    });

    // Ask for confirmation
    console.log("\n⚠️  WARNING: This action cannot be undone!");
    console.log(
      "⚠️  This will delete both database documents AND audio files from storage!",
    );
    const confirmed = await askConfirmation(
      `\nAre you sure you want to delete ${naatsToDelete.length} non-Owais naats and their audio files? (yes/no): `,
    );

    if (!confirmed) {
      console.log("\n❌ Cleanup cancelled by user.");
      return;
    }

    // Perform deletion
    console.log("\n🗑️  Starting deletion...\n");
    let deletedCount = 0;
    let errorCount = 0;
    let audioDeletedCount = 0;
    let audioErrorCount = 0;

    for (const naat of naatsToDelete) {
      try {
        // First, delete audio file from storage if it exists
        if (naat.audioId) {
          try {
            await storage.deleteFile(AUDIO_BUCKET_ID, naat.audioId);
            console.log(`   🎵 Deleted audio: ${naat.audioId}`);
            audioDeletedCount++;
          } catch (audioError) {
            // File might not exist or already deleted
            if (audioError.code === 404) {
              console.log(`   ⚠️  Audio not found: ${naat.audioId} (skipping)`);
            } else {
              console.error(
                `   ❌ Error deleting audio ${naat.audioId}:`,
                audioError.message,
              );
              audioErrorCount++;
            }
          }
        }

        // Then delete the document
        await databases.deleteDocument(
          DATABASE_ID,
          NAATS_COLLECTION_ID,
          naat.$id,
        );
        console.log(`   ✅ Deleted document: ${naat.title}`);
        deletedCount++;
      } catch (error) {
        console.error(`   ❌ Error deleting ${naat.title}:`, error.message);
        errorCount++;
      }
    }

    // Final summary
    console.log("\n" + "═".repeat(60));
    console.log("📊 CLEANUP COMPLETE:");
    console.log("═".repeat(60));
    console.log(`   ✅ Documents deleted: ${deletedCount}`);
    console.log(`   🎵 Audio files deleted: ${audioDeletedCount}`);
    console.log(`   ❌ Document errors: ${errorCount}`);
    console.log(`   ❌ Audio errors: ${audioErrorCount}`);
    console.log(
      `   📺 Remaining Baghdadi naats: ${baghdadiNaats.length - deletedCount}`,
    );
    console.log("═".repeat(60));
    console.log("\n✨ Cleanup finished!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupNonOwaisNaats();
