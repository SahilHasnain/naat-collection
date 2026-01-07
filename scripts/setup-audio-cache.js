/**
 * Appwrite Audio Cache Collection Setup Script
 *
 * This script creates the AudioCache collection for storing YouTube audio URLs
 * with expiry times to reduce RapidAPI calls.
 *
 * Usage: node scripts/setup-audio-cache.js
 */

const sdk = require("node-appwrite");
const path = require("path");
const fs = require("fs");

// Try to load from .env
const envPath = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: envPath });

// Configuration from environment variables
const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_SECRET_KEY,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
};

// Validate configuration
function validateConfig() {
  const missing = [];
  if (!config.endpoint) missing.push("EXPO_PUBLIC_APPWRITE_ENDPOINT");
  if (!config.projectId) missing.push("EXPO_PUBLIC_APPWRITE_PROJECT_ID");
  if (!config.apiKey) missing.push("APPWRITE_SECRET_KEY");
  if (!config.databaseId) missing.push("EXPO_PUBLIC_APPWRITE_DATABASE_ID");

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((v) => console.error(`   - ${v}`));
    process.exit(1);
  }
}

// Initialize Appwrite client
function initializeClient() {
  const client = new sdk.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  return new sdk.Databases(client);
}

// Helper function to wait for attribute creation
async function waitForAttribute(
  databases,
  databaseId,
  collectionId,
  attributeKey
) {
  console.log(`   ⏳ Waiting for attribute '${attributeKey}' to be ready...`);
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    try {
      const collection = await databases.getCollection(
        databaseId,
        collectionId
      );
      const attribute = collection.attributes.find(
        (attr) => attr.key === attributeKey
      );

      if (attribute && attribute.status === "available") {
        console.log(`   ✅ Attribute '${attributeKey}' is ready`);
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error(`   ⚠️  Error checking attribute status: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }
  }

  throw new Error(
    `Attribute '${attributeKey}' did not become available in time`
  );
}

// Create AudioCache collection
async function createAudioCacheCollection(databases) {
  const collectionId = sdk.ID.unique();

  console.log("\n📦 Creating AudioCache collection...");

  try {
    await databases.createCollection({
      databaseId: config.databaseId,
      collectionId: collectionId,
      name: "AudioCache",
      permissions: [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.any()),
        sdk.Permission.update(sdk.Role.any()),
        sdk.Permission.delete(sdk.Role.any()),
      ],
      documentSecurity: false,
    });

    console.log(`✅ Collection created with ID: ${collectionId}`);
    return collectionId;
  } catch (error) {
    console.error(`❌ Failed to create collection: ${error.message}`);
    throw error;
  }
}

// Create all attributes for the AudioCache collection
async function createAttributes(databases, collectionId) {
  console.log("\n📝 Creating attributes...");

  const attributes = [
    {
      name: "youtubeId",
      type: "string",
      size: 50,
      required: true,
      create: () =>
        databases.createStringAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "youtubeId",
          size: 50,
          required: true,
        }),
    },
    {
      name: "audioUrl",
      type: "string",
      size: 2000,
      required: true,
      create: () =>
        databases.createStringAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "audioUrl",
          size: 2000,
          required: true,
        }),
    },
    {
      name: "expiresAt",
      type: "datetime",
      required: true,
      create: () =>
        databases.createDatetimeAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "expiresAt",
          required: true,
        }),
    },
    {
      name: "quality",
      type: "string",
      size: 50,
      required: false,
      create: () =>
        databases.createStringAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "quality",
          size: 50,
          required: false,
        }),
    },
    {
      name: "fetchedAt",
      type: "datetime",
      required: true,
      create: () =>
        databases.createDatetimeAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "fetchedAt",
          required: true,
        }),
    },
    {
      name: "title",
      type: "string",
      size: 500,
      required: false,
      create: () =>
        databases.createStringAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "title",
          size: 500,
          required: false,
        }),
    },
    {
      name: "duration",
      type: "integer",
      required: false,
      create: () =>
        databases.createIntegerAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "duration",
          required: false,
          min: 0,
        }),
    },
  ];

  for (const attr of attributes) {
    try {
      console.log(`\n   Creating ${attr.type} attribute: ${attr.name}`);
      await attr.create();
      console.log(`   ✅ Attribute '${attr.name}' created`);

      // Wait for attribute to be ready before creating the next one
      await waitForAttribute(
        databases,
        config.databaseId,
        collectionId,
        attr.name
      );
    } catch (error) {
      console.error(
        `   ❌ Failed to create attribute '${attr.name}': ${error.message}`
      );
      throw error;
    }
  }

  console.log("\n✅ All attributes created successfully");
}

// Create indexes for performance and uniqueness
async function createIndexes(databases, collectionId) {
  console.log("\n🔍 Creating indexes...");

  const indexes = [
    {
      name: "youtubeId_unique",
      type: sdk.IndexType.Unique,
      attributes: ["youtubeId"],
      description:
        "Unique index on youtubeId to prevent duplicate cache entries",
    },
    {
      name: "expiresAt_asc",
      type: sdk.IndexType.Key,
      attributes: ["expiresAt"],
      orders: ["ASC"],
      description: "Index for finding expired entries (for cleanup)",
    },
    {
      name: "fetchedAt_desc",
      type: sdk.IndexType.Key,
      attributes: ["fetchedAt"],
      orders: ["DESC"],
      description: "Index for sorting by fetch time (most recent first)",
    },
  ];

  for (const index of indexes) {
    try {
      console.log(`\n   Creating ${index.type} index: ${index.name}`);
      await databases.createIndex({
        databaseId: config.databaseId,
        collectionId: collectionId,
        key: index.name,
        type: index.type,
        attributes: index.attributes,
        orders: index.orders || [],
      });
      console.log(`   ✅ Index '${index.name}' created`);
      console.log(`      ${index.description}`);

      // Wait a bit between index creations
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(
        `   ❌ Failed to create index '${index.name}': ${error.message}`
      );
      throw error;
    }
  }

  console.log("\n✅ All indexes created successfully");
}

// Update .env file with the collection ID
async function updateEnvFile(collectionId) {
  console.log("\n📝 Updating .env file...");

  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Check if the variable already exists
    if (
      envContent.includes("EXPO_PUBLIC_APPWRITE_AUDIO_CACHE_COLLECTION_ID=")
    ) {
      // Replace existing value
      envContent = envContent.replace(
        /EXPO_PUBLIC_APPWRITE_AUDIO_CACHE_COLLECTION_ID=.*/,
        `EXPO_PUBLIC_APPWRITE_AUDIO_CACHE_COLLECTION_ID=${collectionId}`
      );
    } else {
      // Add new variable after the naats collection ID
      envContent = envContent.replace(
        /(EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID=.*)/,
        `$1\nEXPO_PUBLIC_APPWRITE_AUDIO_CACHE_COLLECTION_ID=${collectionId}`
      );
    }

    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env updated with AudioCache collection ID");
  } catch (error) {
    console.error(`❌ Failed to update .env: ${error.message}`);
    console.log(
      `\n⚠️  Please manually add to .env:\nEXPO_PUBLIC_APPWRITE_AUDIO_CACHE_COLLECTION_ID=${collectionId}`
    );
  }
}

// Main setup function
async function setup() {
  console.log("🚀 Starting Appwrite Audio Cache Collection Setup\n");
  console.log("═══════════════════════════════════════════════════════════");

  try {
    // Validate configuration
    validateConfig();
    console.log("✅ Configuration validated");

    // Initialize client
    const databases = initializeClient();
    console.log("✅ Appwrite client initialized");

    // Create collection
    const collectionId = await createAudioCacheCollection(databases);

    // Create attributes
    await createAttributes(databases, collectionId);

    // Create indexes
    await createIndexes(databases, collectionId);

    // Update .env
    await updateEnvFile(collectionId);

    console.log(
      "\n═══════════════════════════════════════════════════════════"
    );
    console.log("🎉 Setup completed successfully!\n");
    console.log("📋 Summary:");
    console.log(`   Database ID: ${config.databaseId}`);
    console.log(`   Collection ID: ${collectionId}`);
    console.log(`   Collection Name: AudioCache`);
    console.log("\n📝 Collection Schema:");
    console.log("   - youtubeId (string, unique): YouTube video ID");
    console.log("   - audioUrl (string): Cached audio stream URL");
    console.log("   - expiresAt (datetime): When the URL expires");
    console.log("   - quality (string, optional): Audio quality");
    console.log("   - fetchedAt (datetime): When the URL was fetched");
    console.log("   - title (string, optional): Video title");
    console.log("   - duration (integer, optional): Video duration in seconds");
    console.log("\n📝 Next steps:");
    console.log("   1. Verify the collection in your Appwrite console");
    console.log("   2. Add EXPO_PUBLIC_RAPIDAPI_KEY to your .env file");
    console.log("   3. Update the audioCache service to use RapidAPI");
    console.log("   4. Test the caching functionality");
    console.log("\n");
  } catch (error) {
    console.error(
      "\n═══════════════════════════════════════════════════════════"
    );
    console.error("❌ Setup failed:", error.message);
    console.error("\nPlease check the error above and try again.");
    process.exit(1);
  }
}

// Run setup
setup();
