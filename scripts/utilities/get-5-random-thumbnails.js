/**
 * Get 5 Random Thumbnail Links from NaatDB
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

async function get5RandomThumbnails() {
  try {
    // Fetch first 100 naats
    const response = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [Query.limit(100)],
    );

    const naats = response.documents;

    // Pick 5 random naats
    const randomNaats = [];
    const usedIndices = new Set();

    while (randomNaats.length < 5 && randomNaats.length < naats.length) {
      const randomIndex = Math.floor(Math.random() * naats.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        randomNaats.push(naats[randomIndex]);
      }
    }

    console.log("\n5 Random Thumbnail URLs:\n");
    randomNaats.forEach((naat, index) => {
      console.log(`${index + 1}. ${naat.thumbnailUrl}`);
    });
    console.log("");
  } catch (error) {
    console.error("Error:", error);
  }
}

get5RandomThumbnails();
