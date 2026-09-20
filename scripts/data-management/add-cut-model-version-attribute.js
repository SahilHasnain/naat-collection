/**
 * Add cutModelVersion attribute to the Naats collection
 *
 * Records which model revision produced a naat's cutSegments. The AI worker
 * stamps it (app.py update_naat_cut_segments) from its configured MODEL_REVISION
 * (falls back to "main"). A null/absent value means the naat was cut by an older
 * model and is a candidate for regeneration (scripts/regenerate-cut-audio.js).
 *
 * Usage: node scripts/data-management/add-cut-model-version-attribute.js
 */

const { Client, Databases } = require("node-appwrite");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });
dotenv.config({ path: "apps/mobile/.env.local" });
dotenv.config({ path: "apps/mobile/.env" });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY || process.env.APPWRITE_SECRET_KEY);

const databases = new Databases(client);

async function addCutModelVersionAttribute() {
  console.log("📝 Adding cutModelVersion attribute to Naats collection...\n");

  try {
    await databases.createStringAttribute(
      process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.APPWRITE_NAATS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID,
      "cutModelVersion",
      100,
      false // not required, since existing documents don't have it
    );

    console.log("✅ Attribute created successfully!");
    console.log("   Attribute: cutModelVersion");
    console.log("   Type: string");
    console.log("   Size: 100");
    console.log("   Required: false");
    console.log(
      "\n⏳ Waiting for attribute to be ready (this may take a moment)..."
    );

    let attempts = 0;
    while (attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const collection = await databases.getCollection(
          process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
          process.env.APPWRITE_NAATS_COLLECTION_ID || process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID
        );

        const attr = collection.attributes.find(
          (a) => a.key === "cutModelVersion"
        );
        if (attr && attr.status === "available") {
          console.log("✅ Attribute is now available!");
          return;
        }
      } catch (e) {
        // Continue waiting
      }

      attempts++;
    }

    console.log(
      "⚠️  Attribute may still be processing. Check Appwrite console."
    );
  } catch (error) {
    if (error.code === 409) {
      console.log("ℹ️  Attribute 'cutModelVersion' already exists");
    } else {
      console.error("❌ Error:", error.message);
      throw error;
    }
  }
}

addCutModelVersionAttribute().catch(console.error);