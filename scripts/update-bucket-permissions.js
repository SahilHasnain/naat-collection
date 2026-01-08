/**
 * Update bucket to allow m4a files
 */

const dotenv = require("dotenv");
dotenv.config({ path: ".env.appwrite" });

const { Client, Storage } = require("node-appwrite");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function updateBucket() {
  try {
    console.log("Updating bucket to allow all audio formats...");

    const bucket = await storage.updateBucket(
      "audio-files",
      "Audio Files",
      undefined, // permissions - keep existing
      undefined, // fileSecurity
      true, // enabled
      100 * 1024 * 1024, // maxFileSize: 100MB
      [], // allowedFileExtensions - empty array means all files allowed
      "none", // compression
      false, // encryption
      true // antivirus
    );

    console.log("✅ Bucket updated!");
    console.log(
      `   Allowed extensions: ${bucket.allowedFileExtensions.length === 0 ? "All files" : bucket.allowedFileExtensions.join(", ")}`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

updateBucket();
