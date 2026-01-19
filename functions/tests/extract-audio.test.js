/**
 * Local testing script for audio extraction function
 *
 * This script simulates the Appwrite function execution environment
 * for local testing and development.
 *
 * Usage:
 *   node test-local.js
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const envContent = readFileSync(join(__dirname, ".env"), "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
  console.log("✓ Loaded environment variables from .env");
} catch (err) {
  console.warn("⚠ No .env file found, using environment variables");
}

// Import the function
const functionModule = await import("../extract-audio/src/main.js");
const functionHandler = functionModule.default;

// Mock Appwrite context
const mockContext = {
  req: {
    body: JSON.stringify({
      youtubeId: "dQw4w9WgXcQ", // Rick Astley - Never Gonna Give You Up
    }),
    headers: {
      "content-type": "application/json",
    },
  },
  res: {
    json: (data, status = 200) => {
      console.log("\n--- Response ---");
      console.log(`Status: ${status}`);
      console.log("Body:", JSON.stringify(data, null, 2));
      return { status, body: data };
    },
    send: (data, status = 200) => {
      console.log("\n--- Response ---");
      console.log(`Status: ${status}`);
      console.log("Body:", data);
      return { status, body: data };
    },
  },
  log: (...args) => {
    console.log("[LOG]", ...args);
  },
  error: (...args) => {
    console.error("[ERROR]", ...args);
  },
};

// Run test cases
async function runTests() {
  console.log("=== Audio Extraction Function - Local Test ===\n");

  // Test 1: Valid YouTube ID
  console.log("Test 1: Valid YouTube ID");
  console.log("Request:", mockContext.req.body);
  await functionHandler(mockContext);

  // Test 2: Invalid YouTube ID (too short)
  console.log("\n\nTest 2: Invalid YouTube ID (too short)");
  mockContext.req.body = JSON.stringify({ youtubeId: "short" });
  console.log("Request:", mockContext.req.body);
  await functionHandler(mockContext);

  // Test 3: Invalid YouTube ID (special characters)
  console.log("\n\nTest 3: Invalid YouTube ID (special characters)");
  mockContext.req.body = JSON.stringify({ youtubeId: "invalid@id!" });
  console.log("Request:", mockContext.req.body);
  await functionHandler(mockContext);

  // Test 4: Missing YouTube ID
  console.log("\n\nTest 4: Missing YouTube ID");
  mockContext.req.body = JSON.stringify({});
  console.log("Request:", mockContext.req.body);
  await functionHandler(mockContext);

  // Test 5: Invalid JSON
  console.log("\n\nTest 5: Invalid JSON");
  mockContext.req.body = "{ invalid json }";
  console.log("Request:", mockContext.req.body);
  await functionHandler(mockContext);

  console.log("\n\n=== Tests Complete ===");
}

// Run the tests
runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
