/**
 * Check Embeddings Script
 * 
 * Checks how many naats are already embedded in Supabase
 * Run: node scripts/check-embeddings.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔍 Checking Supabase embeddings...\n");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Count total embeddings
  const { count, error } = await supabase
    .from("naat_embeddings")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("❌ Error querying Supabase:", error.message);
    process.exit(1);
  }

  console.log(`📊 Total embeddings in Supabase: ${count || 0}`);

  // Get sample of embedded naats
  if (count && count > 0) {
    const { data: sample } = await supabase
      .from("naat_embeddings")
      .select("id, title, channel")
      .limit(5);

    console.log("\n📝 Sample embedded naats:");
    sample?.forEach((naat, i) => {
      console.log(`   ${i + 1}. ${naat.title} - ${naat.channel}`);
    });
  }

  console.log("\n✅ Check complete!");
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error.message);
  process.exit(1);
});
