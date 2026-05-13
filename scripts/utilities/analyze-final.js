/**
 * Final Cut Segments Analysis
 * 
 * Counts:
 * - Total naats with audio (not null)
 * - Total naats with cutAudio (not null)
 * - Total naats with cutSegments (not null, including empty arrays)
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

async function analyzeFinal() {
  console.log("📊 Final Analysis\n");

  try {
    let stats = {
      total: 0,
      audioNotNull: 0,
      cutAudioNotNull: 0,
      cutSegmentsNotNull: 0,
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

        // Check audioId (not null)
        if (naat.audioId !== null && naat.audioId !== undefined) {
          stats.audioNotNull++;
        }

        // Check cutAudio (not null)
        if (naat.cutAudio !== null && naat.cutAudio !== undefined) {
          stats.cutAudioNotNull++;
        }

        // Check cutSegments (not null - includes empty arrays and empty strings)
        if (naat.cutSegments !== null && naat.cutSegments !== undefined) {
          stats.cutSegmentsNotNull++;
        }
      }

      if (response.documents.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    // Print results
    console.log("\n" + "=".repeat(70));
    console.log("📊 FINAL ANALYSIS RESULTS");
    console.log("=".repeat(70) + "\n");

    console.log("📈 Counts (NOT NULL):");
    console.log(`   Total Naats: ${stats.total}`);
    console.log(`   audioId (not null): ${stats.audioNotNull}`);
    console.log(`   cutAudio (not null): ${stats.cutAudioNotNull}`);
    console.log(`   cutSegments (not null): ${stats.cutSegmentsNotNull}`);

    console.log("\n📊 Percentages:");
    console.log(`   Audio: ${((stats.audioNotNull / stats.total) * 100).toFixed(1)}%`);
    console.log(`   Cut Audio: ${((stats.cutAudioNotNull / stats.total) * 100).toFixed(1)}%`);
    console.log(`   Cut Segments: ${((stats.cutSegmentsNotNull / stats.total) * 100).toFixed(1)}%`);

    console.log("\n" + "=".repeat(70));

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

analyzeFinal();
