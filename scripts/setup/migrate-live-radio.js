/**
 * Migrate Live Radio Collection
 *
 * Updates the existing live_radio collection to the new simplified schema
 */

const { Client, Databases } = require("node-appwrite");
require("dotenv").config({ path: "apps/mobile/.env" });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

async function migrateLiveRadioCollection() {
  try {
    console.log("🎵 Migrating Live Radio collection...\n");

    // Step 1: Delete old attributes
    console.log("🗑️  Removing old attributes...");

    try {
      await databases.deleteAttribute(
        databaseId,
        "live_radio",
        "currentNaatId",
      );
      console.log("✅ Deleted currentNaatId attribute");
    } catch (err) {
      console.log("⚠️  currentNaatId attribute not found (already deleted?)");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      await databases.deleteAttribute(databaseId, "live_radio", "startedAt");
      console.log("✅ Deleted startedAt attribute");
    } catch (err) {
      console.log("⚠️  startedAt attribute not found (already deleted?)");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Create new attributes
    console.log("\n➕ Creating new attributes...");

    try {
      await databases.createIntegerAttribute(
        databaseId,
        "live_radio",
        "currentTrackIndex",
        true,
        0, // min
        undefined, // max
      );
      console.log("✅ Created currentTrackIndex attribute");
    } catch (err) {
      if (err.code === 409) {
        console.log("⚠️  currentTrackIndex attribute already exists");
      } else {
        throw err;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 3: Delete and recreate the document with new schema
    console.log("\n🔄 Resetting state document...");

    try {
      await databases.deleteDocument(databaseId, "live_radio", "current_state");
      console.log("✅ Deleted old state document");
    } catch (err) {
      console.log("⚠️  State document not found (already deleted?)");
    }

    console.log("\n✅ Migration complete!");
    console.log("\n📝 Next steps:");
    console.log("1. Run: node scripts/testing/test-live-radio.js");
    console.log("2. This will initialize the new playlist");
    console.log("3. Deploy the updated backend function");
    console.log("4. Set scheduled execution to run every 3 minutes");
  } catch (error) {
    console.error("❌ Error migrating Live Radio collection:", error);
    process.exit(1);
  }
}

migrateLiveRadioCollection();
