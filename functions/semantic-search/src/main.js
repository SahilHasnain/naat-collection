/**
 * Appwrite Function: Semantic Search with Supabase Vector DB
 *
 * This function provides AI-powered semantic search using:
 * - Groq API for generating query embeddings
 * - Supabase pgvector for fast vector similarity search
 *
 * Environment Variables Required:
 * - GROQ_API_KEY: Groq API key for embeddings
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_KEY: Supabase publishable API key
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_URL = "https://api.openai.com/v1/embeddings";
const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions

/**
 * Generate embedding for a text using OpenAI API
 * @param {string} text - Text to embed
 * @param {string} openaiApiKey - OpenAI API key
 * @returns {Promise<number[]>} Embedding vector (1536 dimensions)
 */
async function generateEmbedding(text, openaiApiKey) {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI embedding failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Search for similar naats using vector similarity
 * @param {Object} supabase - Supabase client
 * @param {number[]} queryEmbedding - Query embedding vector (1536 dimensions)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of matching naats with similarity scores
 */
async function searchSimilarNaats(supabase, queryEmbedding, limit = 20) {
  const { data, error } = await supabase.rpc("search_naats", {
    query_embedding: queryEmbedding,
    match_count: limit,
  });

  if (error) {
    throw new Error(`Supabase search failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Main function handler
 * @param {Object} context - Appwrite function context
 * @returns {Object} Response object
 */
export default async ({ req, res, log, error: logError }) => {
  try {
    // Parse request body
    const body = req.bodyJson || JSON.parse(req.body || "{}");
    const query = body.query || req.query.query || req.query.q;

    if (!query || query.trim().length === 0) {
      return res.json(
        {
          success: false,
          error: "Missing search query",
        },
        400
      );
    }

    log(`Semantic search query: "${query}"`);

    // Validate environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!openaiApiKey || !supabaseUrl || !supabaseKey) {
      const errorMsg = "Missing required environment variables: OPENAI_API_KEY, SUPABASE_URL, or SUPABASE_KEY";
      logError(errorMsg);
      return res.json(
        {
          success: false,
          error: errorMsg,
        },
        500
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate embedding for the query
    log("Generating query embedding...");
    const queryEmbedding = await generateEmbedding(query, openaiApiKey);
    log(`Generated embedding with ${queryEmbedding.length} dimensions`);

    // Search for similar naats
    log("Searching for similar naats...");
    const results = await searchSimilarNaats(supabase, queryEmbedding, 20);
    log(`Found ${results.length} matching naats`);

    // Format results
    const formattedResults = results.map((result) => ({
      naatId: result.id,
      title: result.title,
      channelName: result.channel,
      score: Math.round(result.similarity * 100),
    }));

    return res.json({
      success: true,
      query,
      results: formattedResults,
      count: formattedResults.length,
    });
  } catch (err) {
    const errorMsg = `Error during semantic search: ${err.message}`;
    logError(errorMsg);

    return res.json(
      {
        success: false,
        error: errorMsg,
      },
      500
    );
  }
};
