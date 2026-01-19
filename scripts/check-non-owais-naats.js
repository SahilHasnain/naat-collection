/**
 * Script to check how many naats in the database don't contain
 * "owais raza", "owais qadri", or "owais raza qadri" in the title
 * for the "baghdadi sound and media" channel
 */

const { Client, Databases, Query } = require("node-appwrite");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "apps", "mobile", ".env.appwrite"),
});

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "")
  .setProject(process.env.APPWRITE_PROJECT_ID || "");

const databases = new Databases(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "";
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID || "";

async function checkNonOwaisNaats() {
  try {
    console.log(
      "🔍 Checking database for non-Owais naats in Baghdadi Sound and Media channel...\n",
    );

    // First, get all naats from "baghdadi sound and media" channel
    let allNaats = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await databases.listDocuments(
        DATABASE_ID,
        NAATS_COLLECTION_ID,
        [Query.limit(limit), Query.offset(offset)],
      );

      allNaats = allNaats.concat(response.documents);
      offset += limit;
      hasMore = response.documents.length === limit;

      console.log(`Fetched ${allNaats.length} documents so far...`);
    }

    console.log(`\n✅ Total documents fetched: ${allNaats.length}\n`);

    // Filter for "baghdadi sound and media" channel (case-insensitive)
    const baghdadiNaats = allNaats.filter(
      (naat) =>
        naat.channelName?.toLowerCase().includes("baghdadi sound") ||
        (naat.channelName?.toLowerCase().includes("baghdadi") &&
          naat.channelName?.toLowerCase().includes("media")),
    );

    console.log(
      `📺 Naats from Baghdadi Sound and Media channel: ${baghdadiNaats.length}\n`,
    );

    // Filter out naats that contain owais raza/qadri in title (with spelling variations)
    const nonOwaisNaats = baghdadiNaats.filter((naat) => {
      const title = naat.title?.toLowerCase() || "";

      // Common spelling variations
      const owaisVariations = [
        "owais",
        "owias",
        "owes",
        "owaiz",
        "awais",
        "awaiz",
        "uwais",
        "uwaiz",
      ];
      const razaVariations = ["raza", "rza", "rezza", "reza"];
      const qadriVariations = [
        "qadri",
        "qadry",
        "qadiri",
        "qaadri",
        "kadri",
        "kadry",
      ];

      // Check if title contains any combination of Owais + Raza
      const hasOwaisRaza = owaisVariations.some((owais) =>
        razaVariations.some(
          (raza) => title.includes(owais) && title.includes(raza),
        ),
      );

      // Check if title contains any combination of Owais + Qadri
      const hasOwaisQadri = owaisVariations.some((owais) =>
        qadriVariations.some(
          (qadri) => title.includes(owais) && title.includes(qadri),
        ),
      );

      return !(hasOwaisRaza || hasOwaisQadri);
    });

    console.log("📊 RESULTS:");
    console.log("═".repeat(60));
    console.log(
      `Total naats in Baghdadi Sound and Media: ${baghdadiNaats.length}`,
    );
    console.log(
      `Naats WITHOUT Owais Raza/Qadri in title: ${nonOwaisNaats.length}`,
    );
    console.log(
      `Naats WITH Owais Raza/Qadri in title: ${baghdadiNaats.length - nonOwaisNaats.length}`,
    );
    console.log("═".repeat(60));

    if (nonOwaisNaats.length > 0) {
      console.log("\n📝 Sample of non-Owais naats (first 10):");
      console.log("-".repeat(60));
      nonOwaisNaats.slice(0, 10).forEach((naat, index) => {
        console.log(`${index + 1}. ${naat.title}`);
        console.log(`   Channel: ${naat.channelName}`);
        console.log(`   ID: ${naat.$id}\n`);
      });
    }

    // Export full list to JSON file
    const fs = require("fs");
    const outputData = {
      summary: {
        totalBaghdadiNaats: baghdadiNaats.length,
        nonOwaisNaats: nonOwaisNaats.length,
        owaisNaats: baghdadiNaats.length - nonOwaisNaats.length,
        percentage:
          ((nonOwaisNaats.length / baghdadiNaats.length) * 100).toFixed(2) +
          "%",
      },
      nonOwaisNaatsList: nonOwaisNaats.map((naat) => ({
        id: naat.$id,
        title: naat.title,
        channelName: naat.channelName,
        youtubeId: naat.youtubeId,
        uploadDate: naat.uploadDate,
      })),
    };

    fs.writeFileSync(
      "non-owais-naats-report.json",
      JSON.stringify(outputData, null, 2),
    );
    console.log("\n💾 Full report saved to: non-owais-naats-report.json");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    process.exit(1);
  }
}

// Run the check
checkNonOwaisNaats();
