/**
 * Batch Embedding Script (Local)
 * 
 * Embeds all naats from Appwrite and stores them in Supabase
 * Run from project root: node scripts/batch-embed-naats.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Client, Databases, Query } from "node-appwrite";
import OpenAI from "openai";

// Load environment variables
dotenv.config();

const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions
const BATCH_SIZE = 50; // Process 50 naats at a time

async function generateEmbedding(text, openaiApiKey) {
  const openai = new OpenAI({ apiKey: openaiApiKey });
  
  const response = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

async function fetchAllNaats(databases, databaseId, collectionId) {
  const allNaats = [];
  let offset = 0;
  const limit = 100;

  console.log("📥 Fetching naats from Appwrite...");

  while (true) {
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.limit(limit),
      Query.offset(offset),
    ]);

    if (response.documents.length === 0) break;

    allNaats.push(...response.documents);
    console.log(`   Fetched ${allNaats.length} naats...`);

    offset += limit;

    if (response.documents.length < limit) break;
  }

  return allNaats;
}

async function main() {
  console.log("🚀 Starting batch embedding process...\n");

  // Check if test mode
  const isTestMode = process.argv.includes("--test");
  const skipExisting = process.argv.includes("--skip-existing");
  const testLimit = isTestMode ? 5 : null;

  if (isTestMode) {
    console.log("🧪 TEST MODE: Processing only 5 naats\n");
  }
  if (skipExisting) {
    console.log("⏭️  SKIP MODE: Skipping already embedded naats\n");
  }

  // Validate environment variables
  const requiredVars = [
    "APPWRITE_ENDPOINT",
    "APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "APPWRITE_DATABASE_ID",
    "APPWRITE_NAATS_COLLECTION_ID",
    "OPENAI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_KEY",
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Initialize clients
  console.log("🔧 Initializing clients...");
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

  // Get already embedded naats if skip mode
  let embeddedIds = new Set();
  if (skipExisting) {
    console.log("📋 Checking for already embedded naats...");
    const { data: embedded } = await supabase
      .from("naat_embeddings")
      .select("id");
    
    if (embedded) {
      embeddedIds = new Set(embedded.map(e => e.id));
      console.log(`   Found ${embeddedIds.size} already embedded naats\n`);
    }
  }

  // Filter out already embedded naats if skip mode
  const naatsToEmbed = skipExisting 
    ? naats.filter(n => !embeddedIds.has(n.$id))
    : naats;

  // Limit to test count if in test mode
  const naatsToProcess = testLimit ? naatsToEmbed.slice(0, testLimit) : naatsToEmbed;

  console.log(`\n📊 Total naats to embed: ${naatsToProcess.length}${testLimit ? ' (TEST MODE)' : ''}${skipExisting ? ` (${embeddedIds.size} skipped)` : ''}\n`);

  // Process in batches
  let processed = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < naatsToProcess.length; i += BATCH_SIZE) {
    const batch = naatsToProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(naatsToProcess.length / BATCH_SIZE);

    console.log(`\n📦 Processing batch ${batchNum}/${totalBatches}...`);

    for (const naat of batch) {
      try {
        // Generate embedding
        const text = `${naat.title} ${naat.channelName}`;
        console.log(`   🔄 Embedding: ${naat.title.substring(0, 50)}...`);
        
        const embedding = await generateEmbedding(text, process.env.OPENAI_API_KEY);
        console.log(`   ✓ Generated embedding (${embedding.length} dimensions)`);

        // Insert into Supabase
        console.log(`   💾 Inserting into Supabase...`);
        const { data, error } = await supabase.from("naat_embeddings").upsert({
          id: naat.$id,
          title: naat.title,
          channel: naat.channelName,
          embedding: embedding,
        });

        if (error) {
          console.error(`   ❌ Supabase error for "${naat.title}":`, {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          errors++;
        } else {
          processed++;
          if (processed % 10 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = (processed / elapsed).toFixed(1);
            console.log(`   ✓ Processed ${processed}/${naatsToProcess.length} (${rate}/sec)`);
          }
        }

        // Rate limiting: wait 100ms between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`   ❌ Error processing "${naat.title}":`, {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n'),
        });
        errors++;
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgRate = (processed / totalTime).toFixed(1);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Batch embedding complete!`);
  console.log(`${"=".repeat(50)}`);
  console.log(`   Total naats:     ${naatsToProcess.length}`);
  console.log(`   Processed:       ${processed}`);
  console.log(`   Errors:          ${errors}`);
  console.log(`   Time taken:      ${totalTime}s`);
  console.log(`   Average rate:    ${avgRate} naats/sec`);
  console.log(`${"=".repeat(50)}\n`);

  if (errors > 0) {
    console.log(`⚠️  ${errors} errors occurred. Check logs above for details.\n`);
  }
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error.message);
  process.exit(1);
});
