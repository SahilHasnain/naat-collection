/**
 * Analyze Filter Impact
 *
 * This script analyzes which naats would be filtered out with the new filtering criteria:
 * - Only "Owais Qadri" or "Owais Raza Qadri" should pass
 * - First letter must be 'O' (no 'A', 'U' variations)
 * - Spelling errors allowed but first letter must be 'O'
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

// Current filter logic (what's in production now)
function currentFilterLogic(title) {
  const titleLower = title.toLowerCase();

  const owaisVariations = [
    "owais",
    "owias",
    "owes",
    "owaiz",
    "awais", // This will be removed
    "awaiz", // This will be removed
    "uwais", // This will be removed
    "uwaiz", // This will be removed
  ];

  const hasOwais = owaisVariations.some((owais) => titleLower.includes(owais));
  const hasRaza = titleLower.includes("raza");
  const hasQadri = titleLower.includes("qadri");

  const isOwaisVideo = hasOwais && (hasRaza || hasQadri);
  return !isOwaisVideo; // true = filtered out
}

// New filter logic (proposed)
function newFilterLogic(title) {
  const titleLower = title.toLowerCase();

  // Only 'O' starting variations allowed
  const owaisVariations = [
    "owais",
    "owias",
    "owes",
    "owaiz",
    "ovais",
    "oveis",
    // NO awais, uwais, etc.
  ];

  const hasOwais = owaisVariations.some((owais) => titleLower.includes(owais));
  const hasQadri = titleLower.includes("qadri");

  // Must have Owais (O-starting) + Qadri
  // This means "Owais Raza" alone will be filtered out
  const isOwaisQadriVideo = hasOwais && hasQadri;

  return !isOwaisQadriVideo; // true = filtered out
}

async function getAllNaatsFromUnofficialSources() {
  const allNaats = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  console.log("📥 Fetching naats from unofficial sources...\n");

  // Get all channels/playlists that are unofficial (isOfficial = false)
  const unofficialChannels = [
    "Baghdadi Sound & Video",
    "Tayyiba Production",
    "Ubaid e Raza",
    // Add more if needed
  ];

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

  // Filter to only unofficial sources
  const unofficialNaats = allNaats.filter((naat) =>
    unofficialChannels.includes(naat.channelName),
  );

  console.log(`📊 Naats from unofficial sources: ${unofficialNaats.length}\n`);

  return unofficialNaats;
}

async function analyzeFilterImpact() {
  try {
    console.log("🔍 Analyzing Filter Impact\n");
    console.log("================================\n");

    const unofficialNaats = await getAllNaatsFromUnofficialSources();

    // Analyze current vs new filtering
    const currentlyKept = unofficialNaats.filter(
      (naat) => !currentFilterLogic(naat.title),
    );
    const currentlyFiltered = unofficialNaats.filter((naat) =>
      currentFilterLogic(naat.title),
    );

    const newKept = unofficialNaats.filter(
      (naat) => !newFilterLogic(naat.title),
    );
    const newFiltered = unofficialNaats.filter((naat) =>
      newFilterLogic(naat.title),
    );

    // Find naats that will be NEWLY filtered out
    const newlyFilteredOut = currentlyKept.filter((naat) =>
      newFilterLogic(naat.title),
    );

    console.log("📊 CURRENT FILTER RESULTS:");
    console.log(`   ✅ Currently kept: ${currentlyKept.length}`);
    console.log(`   🚫 Currently filtered: ${currentlyFiltered.length}\n`);

    console.log("📊 NEW FILTER RESULTS:");
    console.log(`   ✅ Will be kept: ${newKept.length}`);
    console.log(`   🚫 Will be filtered: ${newFiltered.length}\n`);

    console.log("================================");
    console.log("⚠️  IMPACT ANALYSIS\n");
    console.log(
      `🔴 Naats that will be NEWLY FILTERED OUT: ${newlyFilteredOut.length}\n`,
    );

    if (newlyFilteredOut.length > 0) {
      // Group by channel
      const byChannel = {};
      newlyFilteredOut.forEach((naat) => {
        if (!byChannel[naat.channelName]) {
          byChannel[naat.channelName] = [];
        }
        byChannel[naat.channelName].push(naat);
      });

      console.log("📋 BREAKDOWN BY CHANNEL:\n");
      for (const [channel, naats] of Object.entries(byChannel)) {
        console.log(`   ${channel}: ${naats.length} naats`);
      }

      console.log("\n================================");
      console.log("📝 SAMPLE OF NEWLY FILTERED NAATS:\n");

      // Show first 20 examples
      const samples = newlyFilteredOut.slice(0, 20);
      samples.forEach((naat, index) => {
        console.log(`${index + 1}. ${naat.title}`);
        console.log(`   Channel: ${naat.channelName}`);
        console.log(`   Reason: ${getFilterReason(naat.title)}`);
        console.log("");
      });

      if (newlyFilteredOut.length > 20) {
        console.log(`   ... and ${newlyFilteredOut.length - 20} more\n`);
      }

      // Analyze reasons
      console.log("================================");
      console.log("🔍 FILTER REASONS:\n");

      const reasons = {
        awaisVariation: 0,
        uwaisVariation: 0,
        owaisRazaOnly: 0,
        noQadri: 0,
        other: 0,
      };

      newlyFilteredOut.forEach((naat) => {
        const titleLower = naat.title.toLowerCase();
        if (titleLower.includes("awais")) {
          reasons.awaisVariation++;
        } else if (titleLower.includes("uwais")) {
          reasons.uwaisVariation++;
        } else if (
          titleLower.includes("owais") &&
          titleLower.includes("raza") &&
          !titleLower.includes("qadri")
        ) {
          reasons.owaisRazaOnly++;
        } else if (
          titleLower.includes("owais") &&
          !titleLower.includes("qadri")
        ) {
          reasons.noQadri++;
        } else {
          reasons.other++;
        }
      });

      console.log(
        `   Contains "Awais" (not "Owais"): ${reasons.awaisVariation}`,
      );
      console.log(
        `   Contains "Uwais" (not "Owais"): ${reasons.uwaisVariation}`,
      );
      console.log(`   "Owais Raza" without "Qadri": ${reasons.owaisRazaOnly}`);
      console.log(`   "Owais" without "Qadri": ${reasons.noQadri}`);
      console.log(`   Other reasons: ${reasons.other}`);
    }

    console.log("\n================================");
    console.log("✅ Analysis Complete!");
  } catch (error) {
    console.error("\n❌ Analysis failed:", error);
    process.exit(1);
  }
}

function getFilterReason(title) {
  const titleLower = title.toLowerCase();

  if (titleLower.includes("awais")) {
    return 'Contains "Awais" instead of "Owais"';
  }
  if (titleLower.includes("uwais")) {
    return 'Contains "Uwais" instead of "Owais"';
  }
  if (
    titleLower.includes("owais") &&
    titleLower.includes("raza") &&
    !titleLower.includes("qadri")
  ) {
    return '"Owais Raza" without "Qadri"';
  }
  if (titleLower.includes("owais") && !titleLower.includes("qadri")) {
    return '"Owais" without "Qadri"';
  }
  return "Does not match new filter criteria";
}

// Run the analysis
analyzeFilterImpact();
