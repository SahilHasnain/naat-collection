#!/usr/bin/env node

const { Client, Databases, Query } = require("node-appwrite");
require("dotenv").config();

const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.EXPO_PUBLIC_DATABASE_ID;
const COLLECTION_ID = process.env.EXPO_PUBLIC_COLLECTION_ID;

function validateEnv() {
  const required = [
    "EXPO_PUBLIC_APPWRITE_ENDPOINT",
    "EXPO_PUBLIC_APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "EXPO_PUBLIC_DATABASE_ID",
    "EXPO_PUBLIC_COLLECTION_ID",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }
}

function initAppwrite() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  return new Databases(client);
}

async function deleteAllDocuments() {
  console.log("🗑️  Starting deletion of all documents...\n");

  try {
    validateEnv();
    console.log("✅ Environment variables validated");

    const databases = initAppwrite();
    console.log("✅ Appwrite client initialized");

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch documents in batches (max 100 per request)
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.limit(100)]
      );

      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      console.log(
        `\n📦 Found ${response.documents.length} documents to delete...`
      );

      // Delete each document
      for (const doc of response.documents) {
        try {
          await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, doc.$id);
          totalDeleted++;
          console.log(`✅ Deleted: ${doc.title || doc.$id}`);
        } catch (error) {
          console.error(`❌ Error deleting ${doc.$id}:`, error.message);
        }
      }

      console.log(`   Progress: ${totalDeleted} documents deleted so far...`);
    }

    console.log("\n📊 Deletion Summary:");
    console.log(`   🗑️  Total documents deleted: ${totalDeleted}`);
    console.log("\n✨ Deletion complete!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Confirmation prompt
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("⚠️  WARNING: This will delete ALL documents from the database!");
console.log(`   Database ID: ${process.env.EXPO_PUBLIC_DATABASE_ID}`);
console.log(`   Collection ID: ${process.env.EXPO_PUBLIC_COLLECTION_ID}\n`);

rl.question("Are you sure you want to continue? (yes/no): ", (answer) => {
  if (answer.toLowerCase() === "yes") {
    rl.close();
    deleteAllDocuments();
  } else {
    console.log("\n❌ Deletion cancelled.");
    rl.close();
    process.exit(0);
  }
});
