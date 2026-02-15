/**
 * Reinitialize Live Radio Playlist
 *
 * This script reinitializes the live radio playlist with the new duration limit
 * Use this after changing the MAX_DURATION in the live-radio-manager function
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

const PLAYLIST_SIZE = 50;
const MAX_DURATION = 1200; // 20 minutes in seconds

async function generatePlaylist() {
  const playlist = [];
  const seenIds = new Set();

  console.log(
    `\n🎲 Generating playlist with ${MAX_DURATION / 60} minute duration limit...`,
  );

  // Get total count of naats under 20 minutes
  const countResponse = await databases.listDocuments(
    databaseId,
    naatsCollectionId,
    [Query.limit(1), Query.lessThanEqual("duration", MAX_DURATION)],
  );

  const totalNaats = countResponse.total;

  if (totalNaats === 0) {
    throw new Error(
      `No naats found in database under ${MAX_DURATION / 60} minutes duration`,
    );
  }

  console.log(
    `📊 Found ${totalNaats} naats under ${MAX_DURATION / 60} minutes`,
  );
  console.log(`🎵 Creating playlist of ${PLAYLIST_SIZE} tracks...\n`);

  // Generate playlist with random naats
  for (let i = 0; i < PLAYLIST_SIZE && seenIds.size < totalNaats; i++) {
    const randomOffset = Math.floor(Math.random() * totalNaats);

    const response = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [
        Query.limit(1),
        Query.offset(randomOffset),
        Query.lessThanEqual("duration", MAX_DURATION),
      ],
    );

    if (response.documents.length > 0) {
      const naat = response.documents[0];
      if (!seenIds.has(naat.$id)) {
        playlist.push(naat.$id);
        seenIds.add(naat.$id);

        // Show first 10 tracks
        if (i < 10) {
          const minutes = Math.floor(naat.duration / 60);
          const seconds = naat.duration % 60;
          console.log(
            `  ${i + 1}. ${naat.title} (${minutes}:${seconds.toString().padStart(2, "0")})`,
          );
        }
      }
    }
  }

  if (playlist.length < PLAYLIST_SIZE) {
    console.log(`  ... and ${playlist.length - 10} more tracks`);
  }

  console.log(`\n✅ Generated playlist with ${playlist.length} tracks`);
  return playlist;
}

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

async function reinitializeLiveRadio() {
  try {
    console.log("🎵 Reinitializing Live Radio Playlist\n");
    console.log("================================\n");

    // Generate new playlist with 20-minute limit
    const playlist = await generatePlaylist();

    // Update live radio state (start at index 0)
    const state = await updateLiveRadioState(0, playlist);

    // Get first track info
    const firstTrack = await databases.getDocument(
      databaseId,
      naatsCollectionId,
      playlist[0],
    );

    const minutes = Math.floor(firstTrack.duration / 60);
    const seconds = firstTrack.duration % 60;

    console.log("\n================================");
    console.log("✅ Live Radio Reinitialized!\n");
    console.log("📊 Summary:");
    console.log(`   Duration Limit: ${MAX_DURATION / 60} minutes`);
    console.log(`   Playlist Size: ${playlist.length} tracks`);
    console.log(`   Current Track: ${firstTrack.title}`);
    console.log(
      `   Track Duration: ${minutes}:${seconds.toString().padStart(2, "0")}`,
    );
    console.log(`   Track Index: 0 / ${playlist.length}`);
    console.log(`   Updated At: ${state.updatedAt}`);
    console.log("\n💡 The live radio is now playing with the new playlist!");
  } catch (error) {
    console.error("\n❌ Reinitialization failed:", error);
    process.exit(1);
  }
}

// Run the reinitialization
reinitializeLiveRadio();
