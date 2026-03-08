/**
 * Setup Live Radio Listeners Collection
 *
 * Creates the live_radio_listeners collection for tracking active listeners
 */

const { Client, Databases, Permission, Role } = require("node-appwrite");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../apps/mobile/.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

async function setupLiveRadioListenersCollection() {
  try {
    console.log("🎵 Setting up Live Radio Listeners collection...\n");

    // Create live_radio_listeners collection
    console.log("Creating live_radio_listeners collection...");
    const collection = await databases.createCollection(
      databaseId,
      "live_radio_listeners",
      "Live Radio Listeners",
      [
        Permission.read(Role.any()), // Anyone can read listener count
        Permission.create(Role.any()), // Anyone can register as listener
        Permission.update(Role.any()), // Anyone can update their heartbeat
        Permission.delete(Role.any()), // Anyone can unregister
      ],
      false, // Document-level permissions disabled (use collection permissions)
    );
    console.log("✅ Collection created:", collection.$id);

    // Create attributes
    console.log("\nCreating attributes...");

    // lastHeartbeat - Last time this listener was active
    await databases.createStringAttribute(
      databaseId,
      "live_radio_listeners",
      "lastHeartbeat",
      255,
      true,
    );
    console.log("✅ Created lastHeartbeat attribute");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // deviceInfo - Optional device information
    await databases.createStringAttribute(
      databaseId,
      "live_radio_listeners",
      "deviceInfo",
      500,
      false,
    );
    console.log("✅ Created deviceInfo attribute");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create index on lastHeartbeat for efficient queries
    console.log("\nCreating indexes...");
    await databases.createIndex(
      databaseId,
      "live_radio_listeners",
      "lastHeartbeat_index",
      "key",
      ["lastHeartbeat"],
      ["ASC"],
    );
    console.log("✅ Created lastHeartbeat index");

    console.log("\n✅ Live Radio Listeners collection setup complete!");
    console.log("\n📝 How it works:");
    console.log("1. When user starts playing, app creates/updates a listener document");
    console.log("2. App sends heartbeat every 30 seconds to update lastHeartbeat");
    console.log("3. Listener count = documents with lastHeartbeat < 60 seconds ago");
    console.log("4. When user stops/pauses, app deletes the listener document");
    console.log("\n💡 Stale listeners (no heartbeat for 60+ seconds) are ignored in count");
  } catch (error) {
    console.error("❌ Error setting up Live Radio Listeners collection:", error);
    process.exit(1);
  }
}

setupLiveRadioListenersCollection();
