/**
 * Fix MIME type for processed audio file
 * Change from audio/x-m4a to video/mp4 (which browsers support better)
 */

const { Client, Storage, Permission, Role } = require("node-appwrite");
const dotenv = require("dotenv");
const { join } = require("path");

dotenv.config({ path: join(__dirname, "../../.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function fixMimeType(fileId) {
  console.log("🔧 Fixing MIME type...\n");

  try {
    const file = await storage.getFile("audio-files", fileId);
    console.log(`Current file: ${file.name}`);
    console.log(`Current MIME type: ${file.mimeType}\n`);

    // Appwrite doesn't allow direct MIME type update
    // We need to update the file with a new name that has .mp4 extension
    const newName = file.name.replace(".m4a", ".mp4");

    console.log(`Updating file name to: ${newName}`);
    console.log(`This will change MIME type to: video/mp4\n`);

    const updated = await storage.updateFile("audio-files", fileId, newName, [
      Permission.read(Role.any()),
    ]);

    console.log("✅ File updated!");
    console.log(`New name: ${updated.name}`);
    console.log(`New MIME type: ${updated.mimeType}\n`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

const fileId = process.argv[2];

if (!fileId) {
  console.error("❌ Usage: node fix-mime-type.js <fileId>");
  process.exit(1);
}

fixMimeType(fileId);
