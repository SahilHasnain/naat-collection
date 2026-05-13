/**
 * Detailed Cut Segments Analysis
 * 
 * This script provides detailed analysis of cutSegments field
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

async function analyzeDetailed() {
  console.log("🔍 Detailed Cut Segments Analysis\n");

  try {
    let stats = {
      total: 0,
      withAudio: 0,
      withCutAudio: 0,
      cutSegmentsNull: 0,
      cutSegmentsEmptyArray: 0,
      cutSegmentsEmptyString: 0,
      cutSegmentsValidArray: 0,
      cutSegmentsOther: 0,
    };

    const examples = {
      cutSegmentsNull: [],
      cutSegmentsEmptyArray: [],
      cutSegmentsEmptyString: [],
      cutSegmentsValidArray: [],
      cutSegmentsOther: [],
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

        // Check audio
        if (naat.audio) stats.withAudio++;
        if (naat.cutAudio) stats.withCutAudio++;

        // Detailed cutSegments analysis
        const cs = naat.cutSegments;
        
        if (cs === null || cs === undefined) {
          stats.cutSegmentsNull++;
          if (examples.cutSegmentsNull.length < 3) {
            examples.cutSegmentsNull.push({
              id: naat.$id,
              title: naat.title,
              audio: !!naat.audio,
              cutAudio: !!naat.cutAudio,
              cutSegments: cs,
            });
          }
        } else if (Array.isArray(cs)) {
          if (cs.length === 0) {
            stats.cutSegmentsEmptyArray++;
            if (examples.cutSegmentsEmptyArray.length < 3) {
              examples.cutSegmentsEmptyArray.push({
                id: naat.$id,
                title: naat.title,
                audio: !!naat.audio,
                cutAudio: !!naat.cutAudio,
                cutSegments: cs,
              });
            }
          } else {
            stats.cutSegmentsValidArray++;
            if (examples.cutSegmentsValidArray.length < 3) {
              examples.cutSegmentsValidArray.push({
                id: naat.$id,
                title: naat.title,
                audio: !!naat.audio,
                cutAudio: !!naat.cutAudio,
                cutSegments: cs,
              });
            }
          }
        } else if (typeof cs === 'string') {
          if (cs.trim() === '' || cs === '[]') {
            stats.cutSegmentsEmptyString++;
            if (examples.cutSegmentsEmptyString.length < 3) {
              examples.cutSegmentsEmptyString.push({
                id: naat.$id,
                title: naat.title,
                audio: !!naat.audio,
                cutAudio: !!naat.cutAudio,
                cutSegments: cs,
              });
            }
          } else {
            // Try to parse
            try {
              const parsed = JSON.parse(cs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                stats.cutSegmentsValidArray++;
                if (examples.cutSegmentsValidArray.length < 3) {
                  examples.cutSegmentsValidArray.push({
                    id: naat.$id,
                    title: naat.title,
                    audio: !!naat.audio,
                    cutAudio: !!naat.cutAudio,
                    cutSegments: parsed,
                  });
                }
              } else {
                stats.cutSegmentsEmptyArray++;
                if (examples.cutSegmentsEmptyArray.length < 3) {
                  examples.cutSegmentsEmptyArray.push({
                    id: naat.$id,
                    title: naat.title,
                    audio: !!naat.audio,
                    cutAudio: !!naat.cutAudio,
                    cutSegments: parsed,
                  });
                }
              }
            } catch (e) {
              stats.cutSegmentsOther++;
              if (examples.cutSegmentsOther.length < 3) {
                examples.cutSegmentsOther.push({
                  id: naat.$id,
                  title: naat.title,
                  audio: !!naat.audio,
                  cutAudio: !!naat.cutAudio,
                  cutSegments: cs,
                });
              }
            }
          }
        } else {
          stats.cutSegmentsOther++;
          if (examples.cutSegmentsOther.length < 3) {
            examples.cutSegmentsOther.push({
              id: naat.$id,
              title: naat.title,
              audio: !!naat.audio,
              cutAudio: !!naat.cutAudio,
              cutSegments: cs,
              type: typeof cs,
            });
          }
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
    console.log("📊 DETAILED ANALYSIS RESULTS");
    console.log("=".repeat(70) + "\n");

    console.log("📈 Overall:");
    console.log(`   Total Naats: ${stats.total}`);
    console.log(`   With Audio: ${stats.withAudio}`);
    console.log(`   With Cut Audio: ${stats.withCutAudio}`);

    console.log("\n📋 Cut Segments Breakdown:");
    console.log(`   NULL/Undefined: ${stats.cutSegmentsNull} (${((stats.cutSegmentsNull / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Empty Array []: ${stats.cutSegmentsEmptyArray} (${((stats.cutSegmentsEmptyArray / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Empty String: ${stats.cutSegmentsEmptyString} (${((stats.cutSegmentsEmptyString / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Valid Array with Data: ${stats.cutSegmentsValidArray} (${((stats.cutSegmentsValidArray / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Other/Invalid: ${stats.cutSegmentsOther} (${((stats.cutSegmentsOther / stats.total) * 100).toFixed(1)}%)`);

    const totalMissing = stats.cutSegmentsNull + stats.cutSegmentsEmptyArray + stats.cutSegmentsEmptyString;
    console.log(`\n   TOTAL MISSING: ${totalMissing} (${((totalMissing / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   TOTAL WITH DATA: ${stats.cutSegmentsValidArray} (${((stats.cutSegmentsValidArray / stats.total) * 100).toFixed(1)}%)`);

    // Show examples
    console.log("\n" + "=".repeat(70));
    console.log("📝 EXAMPLES");
    console.log("=".repeat(70));

    if (examples.cutSegmentsNull.length > 0) {
      console.log("\n❌ NULL/Undefined cutSegments:");
      examples.cutSegmentsNull.forEach((ex, i) => {
        console.log(`   ${i + 1}. ${ex.title.substring(0, 50)}`);
        console.log(`      ID: ${ex.id}`);
        console.log(`      audio: ${ex.audio}, cutAudio: ${ex.cutAudio}`);
        console.log(`      cutSegments: ${ex.cutSegments}`);
      });
    }

    if (examples.cutSegmentsEmptyArray.length > 0) {
      console.log("\n⚠️  Empty Array [] cutSegments:");
      examples.cutSegmentsEmptyArray.forEach((ex, i) => {
        console.log(`   ${i + 1}. ${ex.title.substring(0, 50)}`);
        console.log(`      ID: ${ex.id}`);
        console.log(`      audio: ${ex.audio}, cutAudio: ${ex.cutAudio}`);
        console.log(`      cutSegments: ${JSON.stringify(ex.cutSegments)}`);
      });
    }

    if (examples.cutSegmentsValidArray.length > 0) {
      console.log("\n✅ Valid cutSegments with Data:");
      examples.cutSegmentsValidArray.forEach((ex, i) => {
        console.log(`   ${i + 1}. ${ex.title.substring(0, 50)}`);
        console.log(`      ID: ${ex.id}`);
        console.log(`      audio: ${ex.audio}, cutAudio: ${ex.cutAudio}`);
        console.log(`      cutSegments: ${JSON.stringify(ex.cutSegments).substring(0, 100)}...`);
      });
    }

    console.log("\n" + "=".repeat(70));

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

analyzeDetailed();
