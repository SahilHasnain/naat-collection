/**
 * Fix cutStatus for documents with null cutAudio
 *
 * Sets cutStatus to null for all documents where cutAudio is null
 * but cutStatus is "done" (inconsistent state)
 */

const {
  Client,
  Databases,
  Query,
} = require("node-appwrite");
const dotenv = require("dotenv");
const { join } = require("path");

dotenv.config({ path: join(__dirname, "../../apps/mobile/.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function fixCutStatus() {
  console.log("🔧 Fixing cutStatus for documents with null cutAudio...\n");

  try {
    let totalFixed = 0;
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      // Get documents where cutAudio is null but cutStatus is "done"
      const response = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_NAATS_COLLECTION_ID,
        [
          Query.isNull("cutAudio"),
          Query.equal("cutStatus", "done"),
          Query.limit(limit),
          Query.offset(offset),
        ],
      );

      console.log(`Batch ${Math.floor(offset / limit) + 1}: Found ${response.documents.length} documents with inconsistent state\n`);

      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      for (const naat of response.documents) {
        console.log(`Processing: ${naat.title}`);
        console.log(`  ID: ${naat.$id}`);
        console.log(`  cutAudio: ${naat.cutAudio}`);
        console.log(`  cutStatus: ${naat.cutStatus}`);

        try {
          // Update cutStatus to null
          await databases.updateDocument(
            process.env.APPWRITE_DATABASE_ID,
            process.env.APPWRITE_NAATS_COLLECTION_ID,
            naat.$id,
            { cutStatus: null },
          );

          console.log(`  ✅ cutStatus set to null\n`);
          totalFixed++;
        } catch (error) {
          console.error(`  ❌ Failed: ${error.message}\n`);
        }
      }

      // Check if there are more documents
      if (response.documents.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    console.log(`\n✅ Complete! Fixed ${totalFixed} documents.`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

fixCutStatus();
