/**
 * Test bucket access
 */

const dotenv = require("dotenv");
dotenv.config({ path: ".env.appwrite" });

const { Client, Storage } = require("node-appwrite");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function testBucket() {
  try {
    console.log("Testing bucket access...");

    const bucket = await storage.getBucket("audio-files");

    console.log("✅ Bucket found!");
    console.log(`   Name: ${bucket.name}`);
    console.log(`   Max size: ${bucket.maximumFileSize / 1024 / 1024}MB`);
    console.log(`   Enabled: ${bucket.enabled}`);
    console.log(`   Permissions: ${JSON.stringify(bucket.$permissions)}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testBucket();
