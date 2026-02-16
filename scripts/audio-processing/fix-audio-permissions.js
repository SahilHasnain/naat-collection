/**
 * Fix permissions for processed audio files
 *
 * Ensures all cutAudio files have proper read permissions
 */

const {
  Client,
  Databases,
  Storage,
  Query,
  Permission,
  Role,
} = require("node-appwrite");
const dotenv = require("dotenv");
const { join } = require("path");

dotenv.config({ path: join(__dirname, "../../.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

async function fixPermissions() {
  console.log("🔧 Fixing permissions for processed audio files...\n");

  try {
    // Get all naats with cutAudio
    const response = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_NAATS_COLLECTION_ID,
      [Query.isNotNull("cutAudio"), Query.limit(100)],
    );

    console.log(
      `Found ${response.documents.length} naats with processed audio\n`,
    );

    for (const naat of response.documents) {
      console.log(`Processing: ${naat.title}`);
      console.log(`  cutAudio ID: ${naat.cutAudio}`);

      try {
        // Update file permissions to allow public read
        await storage.updateFile(
          "audio-files",
          naat.cutAudio,
          undefined, // name (keep existing)
          [Permission.read(Role.any())], // permissions - allow anyone to read
        );

        console.log(`  ✅ Permissions updated\n`);
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}\n`);
      }
    }

    console.log("✅ All permissions updated!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixPermissions();
