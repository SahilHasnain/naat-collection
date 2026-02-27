#!/usr/bin/env node

/**
 * Check how many naats have duration greater than 1 hour (3600 seconds)
 * from the naatDB collection in Appwrite
 */

const { Client, Databases, Query } = require("node-appwrite");
require("dotenv").config();

const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID;

function validateEnv() {
  const required = [
    "EXPO_PUBLIC_APPWRITE_ENDPOINT",
    "EXPO_PUBLIC_APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "EXPO_PUBLIC_APPWRITE_DATABASE_ID",
    "EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID",
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

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

async function checkLongDuration() {
  console.log("🔍 Checking naats with duration > 1 hour (3600 seconds)...\n");

  try {
    validateEnv();
    console.log("✅ Environment variables validated");

    const databases = initAppwrite();
    console.log("✅ Appwrite client initialized\n");

    // Fetch all documents with duration > 3600 seconds (1 hour)
    console.log("📦 Fetching naats with duration > 1 hour...");

    const allLongNaats = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.greaterThan("duration", 3600),
          Query.limit(limit),
          Query.offset(offset),
        ],
      );

      allLongNaats.push(...response.documents);

      console.log(
        `   Fetched ${response.documents.length} naats (offset: ${offset})`,
      );

      if (response.documents.length < limit) {
        break;
      }

      offset += limit;
    }

    console.log(
      `\n📊 Found ${allLongNaats.length} naats with duration > 1 hour\n`,
    );

    if (allLongNaats.length === 0) {
      console.log("✅ No naats found with duration greater than 1 hour.");
      return;
    }

    // Display naats
    console.log("Naats with duration > 1 hour:");
    console.log("─".repeat(100));
    allLongNaats.forEach((naat, index) => {
      console.log(`${index + 1}. ${naat.title}`);
      console.log(
        `   Duration: ${formatDuration(naat.duration)} (${naat.duration}s) | YouTube ID: ${naat.youtubeId}`,
      );
      console.log(`   Channel: ${naat.channelName || "Unknown"}`);
      console.log();
    });
    console.log("─".repeat(100));

    console.log("\n" + "=".repeat(100));
    console.log("📊 Summary:");
    console.log(
      `   Total naats with duration > 1 hour: ${allLongNaats.length}`,
    );
    console.log("=".repeat(100));
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
checkLongDuration();
