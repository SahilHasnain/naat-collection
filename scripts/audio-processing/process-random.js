/**
 * Fetch and process a random naat from the database
 */

const { Client, Databases, Query } = require("node-appwrite");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
const { join } = require("path");

dotenv.config({ path: join(__dirname, "../../.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function getRandomNaat() {
  console.log("🎲 Fetching random naat from database...\n");

  // Get total count
  const countResponse = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_NAATS_COLLECTION_ID,
    [Query.limit(1)],
  );

  const total = countResponse.total;
  console.log(`📊 Total naats in database: ${total}`);

  // Get random offset
  const randomOffset = Math.floor(Math.random() * total);
  console.log(`🎯 Selecting naat at position: ${randomOffset}\n`);

  // Fetch random naat
  const response = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_NAATS_COLLECTION_ID,
    [Query.limit(1), Query.offset(randomOffset)],
  );

  if (response.documents.length === 0) {
    throw new Error("No naats found");
  }

  const naat = response.documents[0];

  console.log("✅ Selected naat:");
  console.log(`   Title: ${naat.title}`);
  console.log(`   Channel: ${naat.channelName}`);
  console.log(`   YouTube ID: ${naat.youtubeId}`);
  console.log(`   Has audio: ${naat.audioId ? "Yes" : "No"}`);
  console.log(`   Has cutAudio: ${naat.cutAudio ? "Yes" : "No"}`);
  console.log(`   Duration: ${naat.duration || "Unknown"}\n`);

  if (!naat.audioId) {
    console.log("⚠️  This naat has no audio file. Trying another...\n");
    return getRandomNaat(); // Recursively try another
  }

  if (naat.cutAudio) {
    console.log("⚠️  This naat is already processed. Trying another...\n");
    return getRandomNaat(); // Recursively try another
  }

  return naat;
}

async function main() {
  try {
    const naat = await getRandomNaat();

    console.log("🚀 Starting AI processing...\n");
    console.log("=".repeat(70));

    // Run the AI processing script
    execSync(
      `node ${join(__dirname, "ai-cut-audio.js")} process ${naat.youtubeId}`,
      { stdio: "inherit" },
    );

    console.log("\n" + "=".repeat(70));
    console.log("✅ Random naat processing complete!");
    console.log("=".repeat(70));
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();
