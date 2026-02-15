/**
 * Search for Owais Raza Naats
 *
 * This script searches the database for naats containing "Owais Raza" variations
 * Accounts for spelling errors and different name formats
 */

const { Client, Databases, Query } = require("node-appwrite");
require("dotenv").config({ path: "apps/mobile/.env" });

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const naatsCollectionId = process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID;

// Search variations (including common spelling errors)
// Each variation is independent - "owais raza" won't match "owais raza qadri"
const searchVariations = [
  { pattern: "owais raza", exact: true },
  { pattern: "owais raza qadri", exact: false },
  { pattern: "owais raza qadiri", exact: false },
  { pattern: "owais razaq", exact: true },
  { pattern: "owais razaq qadri", exact: false },
  { pattern: "owaiz raza", exact: true },
  { pattern: "owaiz raza qadri", exact: false },
  { pattern: "ovais raza", exact: true },
  { pattern: "ovais raza qadri", exact: false },
  { pattern: "uwais raza", exact: true },
  { pattern: "uwais raza qadri", exact: false },
  { pattern: "awais raza", exact: true },
  { pattern: "awais raza qadri", exact: false },
];

function normalizeText(text) {
  return text.toLowerCase().trim();
}

function containsVariation(title, variation) {
  const normalizedTitle = normalizeText(title);
  const normalizedVariation = normalizeText(variation.pattern);

  if (variation.exact) {
    // For exact matches, use word boundaries to avoid matching substrings
    // Match if the pattern appears as a complete phrase (not part of a longer phrase)
    const regex = new RegExp(
      `\\b${normalizedVariation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b(?!\\s+(qadri|qadiri|razaq))`,
      "i",
    );
    return regex.test(normalizedTitle);
  } else {
    // For non-exact, just check if it contains the pattern
    return normalizedTitle.includes(normalizedVariation);
  }
}

async function getAllNaats() {
  const allNaats = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  console.log("📥 Fetching all naats from database...\n");

  while (hasMore) {
    const response = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [Query.limit(limit), Query.offset(offset)],
    );

    allNaats.push(...response.documents);
    offset += limit;
    hasMore = response.documents.length === limit;

    process.stdout.write(`\r   Fetched: ${allNaats.length} naats...`);
  }

  console.log(`\n✅ Total naats in database: ${allNaats.length}\n`);
  return allNaats;
}

async function searchOwaisRaza() {
  try {
    console.log("🔍 Searching for Owais Raza Naats\n");
    console.log("================================\n");

    // Get all naats
    const allNaats = await getAllNaats();

    // Results by variation
    const resultsByVariation = {};
    const matchedNaats = new Map(); // Use Map to avoid duplicates

    console.log("🔎 Searching for variations...\n");

    // Search for each variation
    for (const variation of searchVariations) {
      const matches = allNaats.filter((naat) =>
        containsVariation(naat.title, variation),
      );

      resultsByVariation[variation.pattern] = matches.length;

      // Add to matched naats (avoid duplicates)
      matches.forEach((naat) => {
        if (!matchedNaats.has(naat.$id)) {
          matchedNaats.set(naat.$id, {
            id: naat.$id,
            title: naat.title,
            channelName: naat.channelName || "Unknown",
            duration: naat.duration,
            matchedVariations: [variation.pattern],
          });
        } else {
          // Add this variation to the matched variations list
          matchedNaats.get(naat.$id).matchedVariations.push(variation.pattern);
        }
      });

      if (matches.length > 0) {
        console.log(`✓ "${variation.pattern}": ${matches.length} matches`);
      } else {
        console.log(`✗ "${variation.pattern}": 0 matches`);
      }
    }

    console.log("\n================================");
    console.log("📊 RESULTS SUMMARY\n");
    console.log(`Total unique naats found: ${matchedNaats.size}\n`);

    if (matchedNaats.size > 0) {
      console.log("📝 Matched Naats:\n");

      let index = 1;
      for (const [id, naat] of matchedNaats) {
        const minutes = Math.floor(naat.duration / 60);
        const seconds = naat.duration % 60;
        console.log(`${index}. ${naat.title}`);
        console.log(`   Channel: ${naat.channelName}`);
        console.log(
          `   Duration: ${minutes}:${seconds.toString().padStart(2, "0")}`,
        );
        console.log(`   ID: ${id}`);
        console.log(`   Matched: ${naat.matchedVariations.join(", ")}`);
        console.log("");
        index++;
      }

      console.log("================================");
      console.log("📈 BREAKDOWN BY VARIATION:\n");

      for (const [variation, count] of Object.entries(resultsByVariation)) {
        if (count > 0) {
          console.log(`   "${variation}": ${count}`);
        }
      }
    } else {
      console.log("❌ No naats found with any variation of 'Owais Raza'");
    }

    console.log("\n================================");
    console.log("✅ Search Complete!");
  } catch (error) {
    console.error("\n❌ Search failed:", error);
    process.exit(1);
  }
}

// Run the search
searchOwaisRaza();
