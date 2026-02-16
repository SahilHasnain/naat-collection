/**
 * Just fetch a random naat to test database connectivity
 */

const { Client, Databases, Query } = require("node-appwrite");
const dotenv = require("dotenv");
const { join } = require("path");

dotenv.config({ path: join(__dirname, "../../.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function main() {
  try {
    console.log("🎲 Fetching random naat (>15 minutes)...\n");

    // Get naats with audio, no cutAudio, and duration > 900 seconds (15 min)
    const response = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_NAATS_COLLECTION_ID,
      [
        Query.limit(50),
        Query.isNotNull("audioId"),
        Query.greaterThan("duration", 900),
      ],
    );

    console.log(
      `Found ${response.documents.length} naats with audio >15 min\n`,
    );

    // Filter for those without cutAudio
    const unprocessed = response.documents.filter((n) => !n.cutAudio);

    if (unprocessed.length === 0) {
      console.log("No unprocessed naats found in this batch");
      return;
    }

    console.log(`${unprocessed.length} are unprocessed\n`);

    // Pick random one
    const randomNaat =
      unprocessed[Math.floor(Math.random() * unprocessed.length)];

    const durationMin = Math.floor(randomNaat.duration / 60);
    const durationSec = randomNaat.duration % 60;

    console.log("✅ Random unprocessed naat:");
    console.log(`   Title: ${randomNaat.title}`);
    console.log(`   Channel: ${randomNaat.channelName}`);
    console.log(`   YouTube ID: ${randomNaat.youtubeId}`);
    console.log(
      `   Duration: ${durationMin}:${durationSec.toString().padStart(2, "0")} (${randomNaat.duration}s)`,
    );
    console.log(`\n💡 To process this naat, run:`);
    console.log(`   npm run ai-cut:process ${randomNaat.youtubeId}\n`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
