/**
 * Add audioId attribute to Naats collection
 *
 * Usage: node scripts/add-audio-attribute.js
 */

const { Client, Databases } = require("node-appwrite");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.appwrite" });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function addAudioIdAttribute() {
  console.log("📝 Adding audioId attribute to Naats collection...\n");

  try {
    await databases.createStringAttribute(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_NAATS_COLLECTION_ID,
      "audioId",
      100,
      false // not required, since existing documents don't have it
    );

    console.log("✅ Attribute created successfully!");
    console.log("   Attribute: audioId");
    console.log("   Type: string");
    console.log("   Size: 100");
    console.log("   Required: false");
    console.log(
      "\n⏳ Waiting for attribute to be ready (this may take a moment)..."
    );

    // Wait for attribute to be available
    let attempts = 0;
    while (attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const collection = await databases.getCollection(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_NAATS_COLLECTION_ID
        );

        const attr = collection.attributes.find((a) => a.key === "audioId");
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
      console.log("ℹ️  Attribute 'audioId' already exists");
    } else {
      console.error("❌ Error:", error.message);
      throw error;
    }
  }
}

addAudioIdAttribute().catch(console.error);
