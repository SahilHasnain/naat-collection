/**
 * Fix permissions for a specific audio file
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

async function fixPermissions(fileId) {
  console.log("🔧 Fixing file permissions...\n");
  console.log(`File ID: ${fileId}\n`);

  try {
    // Get current file info
    const file = await storage.getFile("audio-files", fileId);
    console.log(`Current file: ${file.name}`);
    console.log(`Current permissions: ${JSON.stringify(file.$permissions)}\n`);

    // Update permissions to allow public read
    console.log("Updating permissions to allow public read...");
    const updated = await storage.updateFile(
      "audio-files",
      fileId,
      file.name, // keep same name
      [Permission.read(Role.any())], // allow anyone to read
    );

    console.log("✅ Permissions updated!");
    console.log(`New permissions: ${JSON.stringify(updated.$permissions)}\n`);

    console.log("File should now be accessible from browser!");
    console.log(
      `View URL: ${process.env.APPWRITE_ENDPOINT}/storage/buckets/audio-files/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`,
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

const fileId = process.argv[2];

if (!fileId) {
  console.error("❌ Usage: node fix-file-permissions.js <fileId>");
  console.log("\nExample: node fix-file-permissions.js 6992d0c20014c6ee974f");
  process.exit(1);
}

fixPermissions(fileId);
