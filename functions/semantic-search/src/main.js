/**
 * Appwrite Function: Semantic Search with Groq
 *
 * This function provides AI-powered semantic search for naats using Groq API.
 * It uses LLM to understand search intent and match against naat titles/descriptions.
 *
 * Environment Variables Required:
 * - APPWRITE_FUNCTION_PROJECT_ID: Appwrite project ID (auto-provided)
 * - APPWRITE_API_KEY: API key with database read permissions
 * - APPWRITE_DATABASE_ID: Database ID
 * - APPWRITE_NAATS_COLLECTION_ID: Naats collection ID
 * - GROQ_API_KEY: Groq API key
 */

import { Client, Databases, Query } from "node-appwrite";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Fast and accurate

/**
 * Fetches naats from database with pagination
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @param {number} limit - Maximum number of naats to fetch
 * @returns {Promise<Array>} Array of naat objects
 */
async function fetchNaats(databases, databaseId, collectionId, limit = 5000) {
  const allNaats = [];
  let offset = 0;
  const batchSize = 100;

  while (allNaats.length < limit) {
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.limit(batchSize),
      Query.offset(offset),
    ]);

    if (response.documents.length === 0) break;

    allNaats.push(...response.documents);
    offset += batchSize;

    if (response.documents.length < batchSize) break;
  }

  return allNaats.slice(0, limit);
}

/**
 * Performs semantic search using Groq API
 * @param {string} query - User search query
 * @param {Array} naats - Array of naat objects
 * @param {string} groqApiKey - Groq API key
 * @param {Function} log - Logging function
 * @returns {Promise<Array>} Array of matched naat IDs with scores
 */
async function semanticSearch(query, naats, groqApiKey, log) {
  // Prepare naat data for the AI (only essential fields to reduce token usage)
  const naatData = naats.map((naat, index) => ({
    index,
    id: naat.$id,
    title: naat.title,
    channel: naat.channelName,
  }));

  const systemPrompt = `You are a semantic search engine for Islamic naats (devotional songs). 
Your task is to match user queries with relevant naats based on meaning, not just keywords.

Consider:
- Synonyms and related terms (e.g., "praise" matches "hamd", "love" matches "ishq")
- Urdu/Arabic transliterations (e.g., "Muhammad" = "Mohammed" = "Muhammed")
- Common themes (e.g., "Prophet" relates to "Nabi", "Rasool", "Mustafa")
- Partial matches and fuzzy matching
- Channel names if user searches by artist

Return ONLY a JSON array of matching naat indices with scores (0-100), sorted by relevance.
Format: [{"index": 0, "score": 95}, {"index": 5, "score": 80}, ...]

Return maximum 20 results. If no good matches, return empty array [].`;

  const userPrompt = `Search query: "${query}"

Available naats:
${naatData.map((n) => `${n.index}. ${n.title} - ${n.channel}`).join("\n")}

Return matching naats as JSON array with scores.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in Groq response");
    }

    // Parse the JSON response
    let matches;
    try {
      const parsed = JSON.parse(content);
      // Handle both array and object with array property
      matches = Array.isArray(parsed) ? parsed : parsed.matches || parsed.results || [];
    } catch (parseError) {
      log(`Failed to parse Groq response: ${content}`);
      throw new Error("Invalid JSON response from Groq");
    }

    // Map indices back to naat IDs
    const results = matches
      .filter((m) => m.index >= 0 && m.index < naats.length)
      .map((m) => ({
        naatId: naats[m.index].$id,
        title: naats[m.index].title,
        channelName: naats[m.index].channelName,
        thumbnailUrl: naats[m.index].thumbnailUrl,
        score: m.score || 50,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return results;
  } catch (error) {
    throw new Error(`Semantic search failed: ${error.message}`);
  }
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
    const requiredEnvVars = [
      "APPWRITE_FUNCTION_PROJECT_ID",
      "APPWRITE_API_KEY",
      "APPWRITE_DATABASE_ID",
      "APPWRITE_NAATS_COLLECTION_ID",
      "GROQ_API_KEY",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      const errorMsg = `Missing required environment variables: ${missingVars.join(", ")}`;
      logError(errorMsg);
      return res.json(
        {
          success: false,
          error: errorMsg,
        },
        500
      );
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(
        process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
      )
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_NAATS_COLLECTION_ID;
    const groqApiKey = process.env.GROQ_API_KEY;

    // Fetch naats from database
    log("Fetching naats from database...");
    const naats = await fetchNaats(databases, databaseId, collectionId);
    log(`Fetched ${naats.length} naats`);

    // Perform semantic search
    log("Performing semantic search with Groq...");
    const results = await semanticSearch(query, naats, groqApiKey, log);
    log(`Found ${results.length} matching naats`);

    return res.json({
      success: true,
      query,
      results,
      count: results.length,
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
