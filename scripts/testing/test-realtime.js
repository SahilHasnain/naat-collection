/**
 * Test Appwrite Realtime Connection
 * 
 * Verifies that realtime subscriptions work for live radio
 */

const { Client } = require("node-appwrite");
require("dotenv").config({ path: "apps/mobile/.env" });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID);

const databaseId = process.env.APPWRITE_DATABASE_ID;
const channel = `databases.${databaseId}.collections.live_radio.documents.current_state`;

console.log("🎵 Testing Appwrite Realtime for Live Radio\n");
console.log("Channel:", channel);
console.log("\nListening for updates... (Press Ctrl+C to stop)\n");

// Subscribe to realtime updates
const unsubscribe = client.subscribe(channel, (response) => {
  console.log("📡 Realtime event received!");
  console.log("Events:", response.events);
  console.log("Payload:", {
    currentTrackIndex: response.payload.currentTrackIndex,
    playlistLength: response.payload.playlist?.length,
    updatedAt: response.payload.updatedAt,
  });
  console.log("\n✅ Realtime is working!\n");
});

// Keep script running
console.log("Waiting for events...");
console.log("Trigger the live-radio-manager function to see updates.\n");

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nCleaning up...");
  unsubscribe();
  process.exit(0);
});
