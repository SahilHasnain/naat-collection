/**
 * Analyze Cut Segments
 * 
 * This script analyzes all naats in the database to determine:
 * 1. Total number of naats
 * 2. How many have audio files
 * 3. How many have cut audio files
 * 4. How many have cut segments
 * 5. Missing cut audios vs missing cut segments
 */

const { Client, Databases, Query } = require("node-appwrite");
const dotenv = require("dotenv");
const { join } = require("path");

dotenv.config({ path: join(__dirname, "../../apps/mobile/.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function analyzeNaats() {
  console.log("📊 Analyzing Naat Collection...\n");

  try {
    let stats = {
      total: 0,
      withAudio: 0,
      withCutAudio: 0,
      withCutSegments: 0,
      missingCutAudio: 0,
      missingCutSegments: 0,
      hasCutSegmentsButNoCutAudio: 0,
      hasCutAudioButNoSegments: 0,
    };

    let offset = 0;
    const limit = 100;
    let hasMore = true;

    console.log("Fetching naats from database...\n");

    while (hasMore) {
      const response = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_NAATS_COLLECTION_ID,
        [Query.limit(limit), Query.offset(offset)]
      );

      console.log(
        `Processing batch ${Math.floor(offset / limit) + 1}: ${response.documents.length} documents`
      );

      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      for (const naat of response.documents) {
        stats.total++;

        // Check if has audio
        if (naat.audio) {
          stats.withAudio++;
        }

        // Check if has cut audio
        if (naat.cutAudio) {
          stats.withCutAudio++;
        } else {
          stats.missingCutAudio++;
        }

        // Check if has cut segments
        // cutSegments can be an array or a string representation of an array
        let hasCutSegments = false;
        
        if (naat.cutSegments) {
          if (Array.isArray(naat.cutSegments)) {
            hasCutSegments = naat.cutSegments.length > 0;
          } else if (typeof naat.cutSegments === 'string') {
            try {
              const parsed = JSON.parse(naat.cutSegments);
              hasCutSegments = Array.isArray(parsed) && parsed.length > 0;
            } catch (e) {
              // Not valid JSON, check if it's a non-empty string
              hasCutSegments = naat.cutSegments.trim().length > 0 && naat.cutSegments !== '[]';
            }
          }
        }

        if (hasCutSegments) {
          stats.withCutSegments++;
        } else {
          stats.missingCutSegments++;
        }

        // Cross-analysis
        if (hasCutSegments && !naat.cutAudio) {
          stats.hasCutSegmentsButNoCutAudio++;
        }

        if (naat.cutAudio && !hasCutSegments) {
          stats.hasCutAudioButNoSegments++;
        }
      }

      if (response.documents.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("📊 ANALYSIS RESULTS");
    console.log("=".repeat(60) + "\n");

    console.log("📈 Overall Statistics:");
    console.log(`   Total Naats: ${stats.total}`);
    console.log(`   With Audio: ${stats.withAudio} (${((stats.withAudio / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   With Cut Audio: ${stats.withCutAudio} (${((stats.withCutAudio / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   With Cut Segments: ${stats.withCutSegments} (${((stats.withCutSegments / stats.total) * 100).toFixed(1)}%)`);

    console.log("\n❌ Missing Data:");
    console.log(`   Missing Cut Audio: ${stats.missingCutAudio} (${((stats.missingCutAudio / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Missing Cut Segments: ${stats.missingCutSegments} (${((stats.missingCutSegments / stats.total) * 100).toFixed(1)}%)`);

    console.log("\n🔍 Cross-Analysis:");
    console.log(`   Has Cut Segments BUT NO Cut Audio: ${stats.hasCutSegmentsButNoCutAudio}`);
    console.log(`   Has Cut Audio BUT NO Segments: ${stats.hasCutAudioButNoSegments}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ Analysis Complete!");
    console.log("=".repeat(60) + "\n");

    // Additional insights
    console.log("💡 Insights:");
    if (stats.hasCutSegmentsButNoCutAudio > 0) {
      console.log(`   - ${stats.hasCutSegmentsButNoCutAudio} naats have segments but missing cut audio files`);
      console.log(`     These may need to be re-processed to generate cut audio`);
    }
    if (stats.hasCutAudioButNoSegments > 0) {
      console.log(`   - ${stats.hasCutAudioButNoSegments} naats have cut audio but missing segments`);
      console.log(`     These may have been manually cut or processed differently`);
    }
    if (stats.missingCutAudio > 1000) {
      console.log(`   - ${stats.missingCutAudio} naats are missing cut audio`);
      console.log(`     Consider running batch audio cutting process`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

analyzeNaats();
