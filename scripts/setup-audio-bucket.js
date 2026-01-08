/**
 * Setup Audio Storage Bucket
 *
 * Creates a storage bucket for audio files in Appwrite
 *
 * Usage: node scripts/setup-audio-bucket.js
 */

const { Client, Storage, Permission, Role } = require("node-appwrite");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.appwrite" });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function createAudioBucket() {
  console.log("🪣 Creating Audio Storage Bucket...\n");

  try {
    const bucket = await storage.createBucket(
      "audio-files",
      "Audio Files",
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      false, // fileSecurity
      true, // enabled
      100 * 1024 * 1024, // maxFileSize: 100MB
      ["audio/m4a", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/aac"], // allowedFileExtensions
      "none", // compression
      false, // encryption
      true // antivirus
    );

    console.log("✅ Bucket created successfully!");
    console.log(`   Bucket ID: ${bucket.$id}`);
    console.log(`   Bucket Name: ${bucket.name}`);
    console.log(`   Max File Size: ${bucket.maximumFileSize / 1024 / 1024}MB`);
    console.log(`   Allowed Types: ${bucket.allowedFileExtensions.join(", ")}`);
  } catch (error) {
    if (error.code === 409) {
      console.log("ℹ️  Bucket 'audio-files' already exists");
    } else {
      console.error("❌ Error creating bucket:", error.message);
      throw error;
    }
  }
}

createAudioBucket().catch(console.error);
