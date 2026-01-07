#!/usr/bin/env node

/**
 * Local test script for audio extraction function
 *
 * Usage: node test-local.js <youtube-id>
 * Example: node test-local.js IZTEreYp-3g
 */

import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Load environment variables from root .env
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

// Import the function
const mainModule = await import("./src/main.js");
const handler = mainModule.default;

// Get YouTube ID from command line
const youtubeId = process.argv[2];

if (!youtubeId) {
  console.error("Usage: node test-local.js <youtube-id>");
  console.error("Example: node test-local.js IZTEreYp-3g");
  process.exit(1);
}

console.log(`\n🧪 Testing audio extraction for YouTube ID: ${youtubeId}\n`);
console.log(`Environment check:`);
console.log(
  `- YOUTUBE_COOKIES: ${process.env.YOUTUBE_COOKIES ? `✓ Set (${process.env.YOUTUBE_COOKIES.length} chars)` : "✗ Not set"}`
);
console.log(
  `- CACHE_TTL_HOURS: ${process.env.CACHE_TTL_HOURS || "5 (default)"}`
);
console.log("");

// Mock Appwrite context
const mockContext = {
  req: {
    body: JSON.stringify({ youtubeId }),
  },
  res: {
    json: (data, status = 200) => {
      console.log(`\n📤 Response (${status}):`);
      console.log(JSON.stringify(data, null, 2));
      return data;
    },
  },
  log: (...args) => {
    console.log("📝", ...args);
  },
  error: (...args) => {
    console.error("❌", ...args);
  },
};

// Run the function
try {
  await handler(mockContext);
} catch (err) {
  console.error("\n💥 Unhandled error:", err);
  process.exit(1);
}
