/**
 * Local Testing Script for Video Ingestion Function
 *
 * This script allows you to test the ingestion function locally before deploying.
 * It simulates the Appwrite function environment.
 *
 * Usage:
 * 1. Copy .env.example to .env and fill in your credentials
 * 2. Run: node test-local.js
 */

import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, ".env") });

// Mock Appwrite function context
const mockContext = {
  req: {
    bodyJson: {},
    headers: {},
  },
  res: {
    json: (data, status = 200) => {
      console.log("\n📊 Function Response:");
      console.log("Status:", status);
      console.log("Data:", JSON.stringify(data, null, 2));
      return data;
    },
    send: (text, status = 200) => {
      console.log("\n📊 Function Response:");
      console.log("Status:", status);
      console.log("Text:", text);
      return text;
    },
  },
  log: (message) => {
    console.log("📝 LOG:", message);
  },
  error: (message) => {
    console.error("❌ ERROR:", message);
  },
};

// Set required environment variables for testing
process.env.APPWRITE_FUNCTION_PROJECT_ID =
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

async function runTest() {
  console.log("🧪 Testing Video Ingestion Function Locally");
  console.log("============================================\n");

  // Validate environment variables
  const requiredVars = [
    "APPWRITE_FUNCTION_PROJECT_ID",
    "APPWRITE_API_KEY",
    "APPWRITE_DATABASE_ID",
    "APPWRITE_NAATS_COLLECTION_ID",
    "YOUTUBE_CHANNEL_ID",
    "YOUTUBE_API_KEY",
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    console.error("\nPlease create a .env file with all required variables.");
    process.exit(1);
  }

  console.log("✅ Environment variables validated\n");

  try {
    // Import the function
    const { default: handler } = await import("./src/main.js");

    // Execute the function
    console.log("🚀 Executing function...\n");
    await handler(mockContext);

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runTest();
