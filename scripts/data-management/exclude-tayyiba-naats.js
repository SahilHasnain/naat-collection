/**
 * Exclude Tayyiba Production Naats Script
 *
 * Sets exclude=true on all naats from the "Tayyiba Production" channel.
 *
 * Usage: node scripts/data-management/exclude-tayyiba-naats.js
 */

require("dotenv").config({ path: "apps/mobile/.env" });
const { Client, Databases, Query } = require("node-appwrite");

const config = {
    endpoint: process.env.APPWRITE_ENDPOINT || "",
    projectId: process.env.APPWRITE_PROJECT_ID || "",
    apiKey: process.env.APPWRITE_API_KEY || "",
    databaseId: process.env.APPWRITE_DATABASE_ID || "",
    naatsCollectionId: process.env.APPWRITE_NAATS_COLLECTION_ID || "",
};

const CHANNEL_NAME = "Tayyiba Production";
const BATCH_SIZE = 100;

async function main() {
    console.log(`🚀 Excluding all "${CHANNEL_NAME}" naats...\n`);

    if (
        !config.endpoint ||
        !config.projectId ||
        !config.apiKey ||
        !config.databaseId ||
        !config.naatsCollectionId
    ) {
        console.error("❌ Error: Missing required environment variables");
        console.error("   Ensure apps/mobile/.env has:");
        console.error("   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,");
        console.error("   APPWRITE_DATABASE_ID, APPWRITE_NAATS_COLLECTION_ID");
        process.exit(1);
    }

    const client = new Client()
        .setEndpoint(config.endpoint)
        .setProject(config.projectId)
        .setKey(config.apiKey);

    const databases = new Databases(client);

    let updated = 0;
    let alreadyExcluded = 0;
    let errors = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const response = await databases.listDocuments(
            config.databaseId,
            config.naatsCollectionId,
            [
                Query.equal("channelName", CHANNEL_NAME),
                Query.limit(BATCH_SIZE),
                Query.offset(offset),
            ],
        );

        const docs = response.documents;
        console.log(
            `📄 Fetched ${docs.length} documents (offset=${offset}, total=${response.total})`,
        );

        if (docs.length === 0) {
            hasMore = false;
            break;
        }

        for (const doc of docs) {
            if (doc.exclude === true) {
                alreadyExcluded++;
                continue;
            }

            try {
                await databases.updateDocument(
                    config.databaseId,
                    config.naatsCollectionId,
                    doc.$id,
                    { exclude: true },
                );
                updated++;
                console.log(`  ✅ Excluded: ${doc.title}`);
            } catch (error) {
                errors++;
                console.error(`  ❌ Failed: ${doc.title} — ${error.message}`);
            }
        }

        offset += docs.length;
        if (docs.length < BATCH_SIZE) {
            hasMore = false;
        }
    }

    console.log("\n✨ Done!");
    console.log(`\n📊 Summary:`);
    console.log(`  Total found: ${updated + alreadyExcluded + errors}`);
    console.log(`  Updated:          ${updated}`);
    console.log(`  Already excluded: ${alreadyExcluded}`);
    console.log(`  Errors:           ${errors}`);
}

main().catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
});
