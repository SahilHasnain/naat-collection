/**
 * Test Live Radio Feature
 *
 * This script simulates the live radio manager function locally
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

async function getRandomNaat(excludeIds = []) {
  try {
    // Get total count
    const countResponse = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [Query.limit(1)],
    );

    if (!countResponse.total || countResponse.total === 0) {
      throw new Error("No naats found in database");
    }

    console.log(`📊 Total naats in database: ${countResponse.total}`);

    // Generate random offset
    const randomOffset = Math.floor(Math.random() * countResponse.total);

    // Fetch random naat
    const response = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [Query.limit(1), Query.offset(randomOffset)],
    );

    if (response.documents.length === 0) {
      throw new Error("Failed to fetch random naat");
    }

    return response.documents[0];
  } catch (error) {
    console.error("❌ Error getting random naat:", error);
    throw error;
  }
}

async function generatePlaylist(currentNaatId, size = 10) {
  const playlist = [];
  const excludeIds = [currentNaatId];

  console.log(`\n🎵 Generating playlist of ${size} tracks...`);

  for (let i = 0; i < size; i++) {
    try {
      const naat = await getRandomNaat(excludeIds);
      playlist.push(naat.$id);
      excludeIds.push(naat.$id);
      console.log(`  ${i + 1}. ${naat.title} (${naat.duration}s)`);
    } catch (error) {
      console.error(`❌ Error generating playlist item ${i}:`, error);
      break;
    }
  }

  return playlist;
}

async function updateLiveRadioState(currentNaat, playlist) {
  try {
    const now = new Date().toISOString();

    const data = {
      currentNaatId: currentNaat.$id,
      startedAt: now,
      playlist: playlist,
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

    // Get a random naat
    console.log("🎲 Selecting random naat...");
    const currentNaat = await getRandomNaat();
    console.log(`✅ Selected: ${currentNaat.title}`);
    console.log(`   Channel: ${currentNaat.channelName}`);
    console.log(`   Duration: ${currentNaat.duration} seconds`);

    // Generate playlist
    const playlist = await generatePlaylist(currentNaat.$id, 10);
    console.log(`\n✅ Generated playlist with ${playlist.length} tracks`);

    // Update live radio state
    const state = await updateLiveRadioState(currentNaat, playlist);

    console.log("\n================================");
    console.log("✅ Live Radio Test Complete!\n");
    console.log("📊 Summary:");
    console.log(`   Current Naat: ${currentNaat.title}`);
    console.log(`   Started At: ${state.startedAt}`);
    console.log(`   Playlist Size: ${playlist.length}`);
    console.log("\n💡 Next steps:");
    console.log("   1. Open the mobile app");
    console.log('   2. Navigate to the "Live" tab');
    console.log('   3. Tap "Listen Live"');
    console.log("   4. You should hear the selected naat!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testLiveRadio();
