/**
 * Setup Live Radio Collection
 *
 * Creates the live_radio collection in Appwrite database
 */

const { Client, Databases, ID, Permission, Role } = require("node-appwrite");
require("dotenv").config({ path: "apps/mobile/.env" });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

async function setupLiveRadioCollection() {
  try {
    console.log("🎵 Setting up Live Radio collection...\n");

    // Create live_radio collection
    console.log("Creating live_radio collection...");
    const collection = await databases.createCollection(
      databaseId,
      "live_radio",
      "Live Radio",
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
    );
    console.log("✅ Collection created:", collection.$id);

    // Create attributes
    console.log("\nCreating attributes...");

    // currentNaatId - ID of the currently playing naat
    await databases.createStringAttribute(
      databaseId,
      "live_radio",
      "currentNaatId",
      255,
      true,
    );
    console.log("✅ Created currentNaatId attribute");

    // Wait for attribute to be available
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // startedAt - When the current naat started playing
    await databases.createStringAttribute(
      databaseId,
      "live_radio",
      "startedAt",
      255,
      true,
    );
    console.log("✅ Created startedAt attribute");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // playlist - Array of upcoming naat IDs
    await databases.createStringAttribute(
      databaseId,
      "live_radio",
      "playlist",
      10000,
      true,
      undefined,
      true, // array
    );
    console.log("✅ Created playlist attribute");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // updatedAt - Last update timestamp
    await databases.createStringAttribute(
      databaseId,
      "live_radio",
      "updatedAt",
      255,
      true,
    );
    console.log("✅ Created updatedAt attribute");

    console.log("\n✅ Live Radio collection setup complete!");
    console.log("\n📝 Next steps:");
    console.log("1. Deploy the live-radio-manager function to Appwrite");
    console.log("2. Set up a scheduled execution (every 5 minutes)");
    console.log("3. Run the function manually once to initialize the state");
    console.log("4. Add LIVE_RADIO_COLLECTION_ID to your .env files");
  } catch (error) {
    console.error("❌ Error setting up Live Radio collection:", error);
    process.exit(1);
  }
}

setupLiveRadioCollection();
