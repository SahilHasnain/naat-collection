/**
 * Test Live Radio Feature
 *
 * This script simulates the simplified live radio manager locally
 * Useful for testing before deploying to Appwrite
 */

const { Client, Databases, Query } = require("node-appwrite");
require("dotenv").config({ path: "apps/mobile/.env" });

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const naatsCollectionId = process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID;

async function updateLiveRadioState(currentTrackIndex, playlist) {
  try {
    const now = new Date().toISOString();

    const data = {
      currentTrackIndex,
      playlist,
      updatedAt: now,
    };

    console.log("\n📝 Updating live radio state...");

    // Try to update existing document
    try {
      await databases.updateDocument(
        databaseId,
        "live_radio",
        "current_state",
        data,
      );
      console.log("✅ Updated live radio state");
    } catch (updateError) {
      // If document doesn't exist, create it
      if (updateError.code === 404) {
        await databases.createDocument(
          databaseId,
          "live_radio",
          "current_state",
          data,
        );
        console.log("✅ Created live radio state");
      } else {
        throw updateError;
      }
    }

    return data;
  } catch (error) {
    console.error("❌ Error updating live radio state:", error);
    throw error;
  }
}

async function testLiveRadio() {
  try {
    console.log("🎵 Testing Live Radio Feature\n");
    console.log("================================\n");

    // Generate a playlist
    console.log("🎲 Generating playlist...");
    const playlist = [];
    const seenIds = new Set();

    const countResponse = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [Query.limit(1)],
    );

    const totalNaats = countResponse.total;
    const playlistSize = Math.min(50, totalNaats);

    console.log(`📊 Total naats in database: ${totalNaats}`);
    console.log(`🎵 Creating playlist of ${playlistSize} tracks...\n`);

    for (let i = 0; i < playlistSize; i++) {
      const randomOffset = Math.floor(Math.random() * totalNaats);
      const response = await databases.listDocuments(
        databaseId,
        naatsCollectionId,
        [Query.limit(1), Query.offset(randomOffset)],
      );

      if (response.documents.length > 0) {
        const naat = response.documents[0];
        if (!seenIds.has(naat.$id)) {
          playlist.push(naat.$id);
          seenIds.add(naat.$id);
          if (i < 5) {
            // Show first 5
            console.log(`  ${i + 1}. ${naat.title} (${naat.duration}s)`);
          }
        }
      }
    }

    console.log(`  ... and ${playlist.length - 5} more tracks`);
    console.log(`\n✅ Generated playlist with ${playlist.length} tracks`);

    // Update live radio state (start at index 0)
    const state = await updateLiveRadioState(0, playlist);

    // Get first track info
    const firstTrack = await databases.getDocument(
      databaseId,
      naatsCollectionId,
      playlist[0],
    );

    console.log("\n================================");
    console.log("✅ Live Radio Test Complete!\n");
    console.log("📊 Summary:");
    console.log(`   Current Track: ${firstTrack.title}`);
    console.log(`   Track Index: 0 / ${playlist.length}`);
    console.log(`   Updated At: ${state.updatedAt}`);
    console.log("\n💡 Next steps:");
    console.log("   1. Open the mobile app");
    console.log('   2. Navigate to the "Live" tab');
    console.log('   3. Tap "Listen Live"');
    console.log("   4. You should hear the first track!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testLiveRadio();
