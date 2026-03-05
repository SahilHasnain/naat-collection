/**
 * Batch Embedding Script
 * 
 * Embeds all naats from Appwrite and stores them in Supabase
 * Run: node batch-embed.js
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { Client, Databases, Query } from "node-appwrite";

const GROQ_API_URL = "https://api.groq.com/openai/v1/embeddings";
const GROQ_EMBEDDING_MODEL = "nomic-embed-text-v1.5";
const BATCH_SIZE = 50; // Process 50 naats at a time

async function generateEmbedding(text, groqApiKey) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq embedding failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function fetchAllNaats(databases, databaseId, collectionId) {
  const allNaats = [];
  let offset = 0;
  const limit = 100;

  console.log("Fetching naats from Appwrite...");

  while (true) {
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.limit(limit),
      Query.offset(offset),
    ]);

    if (response.documents.length === 0) break;

    allNaats.push(...response.documents);
    console.log(`Fetched ${allNaats.length} naats...`);

    offset += limit;

    if (response.documents.length < limit) break;
  }

  return allNaats;
}

async function main() {
  console.log("Starting batch embedding process...\n");

  // Validate environment variables
  const requiredVars = [
    "APPWRITE_ENDPOINT",
    "APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "APPWRITE_DATABASE_ID",
    "APPWRITE_NAATS_COLLECTION_ID",
    "GROQ_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_KEY",
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Initialize clients
  const appwriteClient = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(appwriteClient);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  // Fetch all naats
  const naats = await fetchAllNaats(
    databases,
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_NAATS_COLLECTION_ID
  );

  console.log(`\nTotal naats to embed: ${naats.length}\n`);

  // Process in batches
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < naats.length; i += BATCH_SIZE) {
    const batch = naats.slice(i, i + BATCH_SIZE);

    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(naats.length / BATCH_SIZE)}...`
    );

    for (const naat of batch) {
      try {
        // Generate embedding
        const text = `${naat.title} ${naat.channelName}`;
        const embedding = await generateEmbedding(text, process.env.GROQ_API_KEY);

        // Insert into Supabase
        const { error } = await supabase.from("naat_embeddings").upsert({
          id: naat.$id,
          title: naat.title,
          channel: naat.channelName,
          embedding: embedding,
        });

        if (error) {
          console.error(`Error inserting ${naat.title}:`, error.message);
          errors++;
        } else {
          processed++;
          if (processed % 10 === 0) {
            console.log(`  Processed ${processed}/${naats.length}...`);
          }
        }

        // Rate limiting: wait 100ms between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing ${naat.title}:`, error.message);
        errors++;
      }
    }
  }

  console.log(`\n✅ Batch embedding complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(console.error);
