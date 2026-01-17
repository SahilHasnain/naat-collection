#!/usr/bin/env node

/**
 * YouTube Cookie Exporter
 *
 * This script helps you export YouTube cookies from your browser
 * and encode them for use with the audio extraction function.
 *
 * Usage:
 * 1. Install browser extension "Get cookies.txt LOCALLY"
 * 2. Visit youtube.com while logged in
 * 3. Export cookies to a file (e.g., youtube-cookies.txt)
 * 4. Run: node export-youtube-cookies.js youtube-cookies.txt
 * 5. Copy the base64 output to your YOUTUBE_COOKIES env variable
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node export-youtube-cookies.js <cookies-file.txt>");
  console.error("");
  console.error("Steps to export cookies:");
  console.error('1. Install "Get cookies.txt LOCALLY" browser extension');
  console.error("2. Visit youtube.com while logged in");
  console.error("3. Click the extension and export cookies");
  console.error("4. Save to a file (e.g., youtube-cookies.txt)");
  console.error("5. Run this script with that file");
  process.exit(1);
}

const cookieFile = resolve(args[0]);

try {
  const cookiesContent = readFileSync(cookieFile, "utf-8");

  // Validate it looks like a Netscape cookies file
  if (
    !cookiesContent.includes("# Netscape HTTP Cookie File") &&
    !cookiesContent.includes(".youtube.com")
  ) {
    console.error(
      "Warning: File does not appear to be a valid Netscape cookies file"
    );
    console.error("Make sure you exported cookies in the correct format");
  }

  // Encode to base64
  const base64Cookies = Buffer.from(cookiesContent).toString("base64");

  console.log("✓ Cookies exported successfully!");
  console.log("");
  console.log("Add this to your Appwrite Function environment variables:");
  console.log("");
  console.log("YOUTUBE_COOKIES=" + base64Cookies);
  console.log("");
  console.log("Or save to .env file:");
  console.log("");
  console.log(`echo "YOUTUBE_COOKIES=${base64Cookies}" >> .env`);
} catch (err) {
  console.error(`Error reading cookie file: ${err.message}`);
  process.exit(1);
}
