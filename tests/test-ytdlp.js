#!/usr/bin/env node

/**
 * Test script to verify yt-dlp works for audio extraction
 * This tests the core functionality before implementing the full feature
 */

const { execSync } = require("child_process");

// Test YouTube video ID (a short public video)
const TEST_YOUTUBE_ID = "LCFWd4DdL3M"; // "naat sharif

console.log("🧪 Testing yt-dlp for audio extraction...\n");

// Step 1: Check if yt-dlp is installed
console.log("1️⃣ Checking if yt-dlp is installed...");
try {
  const version = execSync("yt-dlp --version", { encoding: "utf-8" }).trim();
  console.log(`✅ yt-dlp is installed (version: ${version})\n`);
} catch (error) {
  console.error("❌ yt-dlp is not installed!");
  console.error("\nInstallation instructions:");
  console.error("  Windows: winget install yt-dlp");
  console.error(
    "  Or download from: https://github.com/yt-dlp/yt-dlp/releases"
  );
  process.exit(1);
}

// Step 2: Test extracting audio URL
console.log("2️⃣ Testing audio URL extraction...");
console.log(`   YouTube ID: ${TEST_YOUTUBE_ID}`);
console.log("   Command: yt-dlp --get-url -f bestaudio");

(async () => {
  try {
    const startTime = Date.now();

    const audioUrl = execSync(
      `yt-dlp --get-url -f bestaudio https://www.youtube.com/watch?v=${TEST_YOUTUBE_ID}`,
      {
        encoding: "utf-8",
        timeout: 10000, // 10 second timeout
      }
    ).trim();

    const duration = Date.now() - startTime;

    console.log(`✅ Audio URL extracted successfully in ${duration}ms\n`);
    console.log("📋 Extracted URL:");
    console.log(`   ${audioUrl.substring(0, 100)}...`);
    console.log(`   Length: ${audioUrl.length} characters\n`);

    // Step 3: Test getting format info
    console.log("3️⃣ Testing format information extraction...");

    const formatInfo = execSync(
      `yt-dlp -f bestaudio --print "%(format_id)s %(ext)s %(abr)s" https://www.youtube.com/watch?v=${TEST_YOUTUBE_ID}`,
      {
        encoding: "utf-8",
        timeout: 10000,
      }
    ).trim();

    console.log(`✅ Format info: ${formatInfo}\n`);

    // Step 4: Test if URL is playable
    console.log("4️⃣ Testing if audio URL is playable...");
    console.log("   Making HEAD request to verify URL accessibility...");

    try {
      const https = require("https");
      const url = require("url");

      await new Promise((resolve, reject) => {
        const makeRequest = (targetUrl, redirectCount = 0) => {
          if (redirectCount > 3) {
            reject(new Error("Too many redirects"));
            return;
          }

          const parsedUrl = url.parse(targetUrl);
          const options = {
            method: "HEAD",
            hostname: parsedUrl.hostname,
            path: parsedUrl.path,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          };

          const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
              console.log(`✅ URL is accessible (Status: ${res.statusCode})`);
              console.log(`   Content-Type: ${res.headers["content-type"]}`);
              const contentLength = res.headers["content-length"];
              if (contentLength) {
                console.log(
                  `   Content-Length: ${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB`
                );
              }
              resolve();
            } else if (res.statusCode === 302 || res.statusCode === 301) {
              console.log(`   Following redirect (${res.statusCode})...`);
              const redirectUrl = res.headers.location;
              if (redirectUrl) {
                makeRequest(redirectUrl, redirectCount + 1);
              } else {
                reject(new Error("Redirect without location header"));
              }
            } else {
              reject(new Error(`URL returned status code: ${res.statusCode}`));
            }
          });

          req.on("error", reject);
          req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error("Request timeout"));
          });
          req.end();
        };

        makeRequest(audioUrl);
      });

      console.log("✅ Audio URL is playable!\n");
    } catch (error) {
      console.error(`❌ URL validation failed: ${error.message}\n`);
      process.exit(1);
    }

    // Step 5: Summary
    console.log("✨ All tests passed!");
    console.log("\n📊 Summary:");
    console.log("   ✅ yt-dlp is installed and working");
    console.log("   ✅ Can extract audio URLs from YouTube");
    console.log("   ✅ Can get format information");
    console.log("   ✅ Audio URL is accessible and playable");
    console.log("   ✅ Extraction is fast enough (< 10 seconds)");
    console.log("\n🚀 Ready to implement the audio playback feature!");
  } catch (error) {
    console.error("❌ Audio extraction failed!");
    console.error("\nError details:");
    console.error(error.message);

    if (error.message.includes("timeout")) {
      console.error("\n⚠️  Extraction took too long (> 10 seconds)");
    }

    process.exit(1);
  }
})();
