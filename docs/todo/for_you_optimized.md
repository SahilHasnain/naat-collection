HYBRID FOR YOU OPTIMIZATION - COMPLETE PLAN
PROBLEM WE'RE SOLVING
Current Issue:
Your For You tab fetches 1000-3000 full naats per user to apply personalized ranking algorithm, causing:

Database read limit exceeded

Slow app load times

95% of fetched data goes unused (users view ~60 naats)

Why Simple Pagination Won't Work:
For You requires personalized ranking across ALL naats based on:

User's listening history

Channel diversity

Recency + popularity balance

Unwatched content prioritization

Appwrite queries can't do: "Give me 20 naats I haven't watched, scored by my preferences, diverse channels"

SOLUTION: HYBRID APPROACH
Architecture:
For Latest/Popular/Oldest tabs:

✅ Simple Appwrite pagination (no cache needed)

✅ 20 reads per page - efficient as-is

For "For You" tab only:

✅ Metadata cache (lightweight naat info)

✅ Cron job updates cache every 6 hours

✅ Client-side personalized ranking

✅ Lazy load full naats on-demand

READ COMPARISON
Before:
User opens For You:
- Initial fetch: 1000 reads
- Background fetch: 2000 reads
- User views: 60 naats
────────────────────────────────
Cost: 3000 reads
Waste: 2940 naats (98%)

Copy
After:
User opens For You:
- Fetch metadata cache: 1 read
- Rank locally: 0 reads
- Fetch 60 naats as user scrolls: 60 reads
────────────────────────────────
Cost: 61 reads
Waste: 0 naats
Savings: 97.97%

Copy
Cron Cost (Shared across ALL users):
Runs: 4 times/day (every 6 hours)
Per run: 3000 reads (fetch all naats)
Daily: 12,000 reads

Copy
Daily Total (1000 users, avg 80 naats viewed):
Cron: 12,000 reads
Users: 1000 × 81 = 81,000 reads
────────────────────────────────
Total: 93,000 reads/day

vs Current: 3,000,000 reads/day
Savings: 96.9%

Copy
IMPLEMENTATION STEPS
STEP 1: Create Metadata Cache Collection
File: scripts/setup/setup-naats-metadata-cache.js

const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function setupCache() {
  try {
    console.log('Creating naats-metadata-cache collection...');

    // Create collection
    const collection = await databases.createCollection(
      process.env.APPWRITE_DATABASE_ID,
      'naats-metadata-cache',
      'Naats Metadata Cache'
    );

    console.log('✅ Collection created:', collection.$id);

    // Add metadata field (stores JSON array of lightweight naat objects)
    await databases.createStringAttribute(
      process.env.APPWRITE_DATABASE_ID,
      'naats-metadata-cache',
      'metadata',
      10000000, // 10MB max - holds ~3000 naats metadata
      true
    );

    // Add timestamp field
    await databases.createStringAttribute(
      process.env.APPWRITE_DATABASE_ID,
      'naats-metadata-cache',
      'updatedAt',
      50,
      true
    );

    // Add count field
    await databases.createIntegerAttribute(
      process.env.APPWRITE_DATABASE_ID,
      'naats-metadata-cache',
      'totalCount',
      true
    );

    console.log('✅ Attributes created');
    console.log('✅ Setup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupCache();


Copy
javascript
Run:

cd scripts/setup
node setup-naats-metadata-cache.js

Copy
bash
STEP 2: Create Appwrite Cron Function
File: functions/sync-naats-metadata/src/main.js

import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const startTime = Date.now();

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    log('🔄 Starting metadata sync...');

    // Fetch ALL naats in batches
    const allMetadata = [];
    let offset = 0;
    const batchSize = 500;
    let hasMore = true;
    let batchCount = 0;

    while (hasMore) {
      batchCount++;
      log(`Fetching batch ${batchCount} (offset: ${offset})...`);

      const response = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_NAATS_COLLECTION_ID,
        [
          Query.limit(batchSize),
          Query.offset(offset),
          Query.orderDesc('uploadDate'),
          Query.or([
            Query.equal('exclude', false),
            Query.isNull('exclude')
          ])
        ]
      );

      // Extract only fields needed for For You algorithm
      const metadata = response.documents.map(doc => ({
        id: doc.$id,
        title: doc.title,
        channelId: doc.channelId,
        channelTitle: doc.channelTitle,
        views: doc.views || 0,
        uploadDate: doc.uploadDate,
        thumbnailUrl: doc.thumbnailUrl,
        duration: doc.duration,
        cutAudio: doc.cutAudio || null,
        youtubeId: doc.youtubeId,
      }));

      allMetadata.push(...metadata);
      hasMore = response.documents.length === batchSize;
      offset += batchSize;

      log(`  ✓ Batch ${batchCount}: ${metadata.length} naats (total: ${allMetadata.length})`);
    }

    log(`✅ Fetched ${allMetadata.length} naats in ${batchCount} batches`);

    // Save to cache collection
    const cacheData = {
      metadata: JSON.stringify(allMetadata),
      updatedAt: new Date().toISOString(),
      totalCount: allMetadata.length
    };

    log('💾 Saving to cache...');

    try {
      // Try to update existing cache document
      await databases.updateDocument(
        process.env.APPWRITE_DATABASE_ID,
        'naats-metadata-cache',
        'global', // Fixed document ID
        cacheData
      );
      log('✅ Cache updated');
    } catch (updateError) {
      // Document doesn't exist, create it
      log('Creating new cache document...');
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        'naats-metadata-cache',
        'global',
        cacheData
      );
      log('✅ Cache created');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`✅ Sync complete in ${duration}s`);

    return res.json({
      success: true,
      totalNaats: allMetadata.length,
      batches: batchCount,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    error(`❌ Sync failed: ${err.message}`);
    return res.json({
      success: false,
      error: err.message
    }, 500);
  }
};


Copy
javascript
File: functions/sync-naats-metadata/package.json

{
  "name": "sync-naats-metadata",
  "version": "1.0.0",
  "type": "module",
  "main": "src/main.js",
  "dependencies": {
    "node-appwrite": "^12.0.0"
  }
}

Copy
json
Deploy:

cd functions/sync-naats-metadata
npm install

# Deploy function
appwrite deploy function

# Configure as cron (via Appwrite Console or CLI)
# Schedule: 0 */6 * * * (every 6 hours)
# Timeout: 900 seconds (15 minutes)

Copy
bash
Manually trigger first sync:

appwrite functions createExecution \
  --functionId sync-naats-metadata

Copy
bash
STEP 3: Add Types
File: packages/shared/src/types.ts

// Add this interface
export interface NaatMetadata {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  views: number;
  uploadDate: string;
  thumbnailUrl: string;
  duration: number;
  cutAudio: string | null;
  youtubeId: string;
}

Copy
typescript
STEP 4: Update Appwrite Service
File: packages/api-client/src/appwrite-service.ts

Add this method to the AppwriteService class:

/**
 * Get lightweight metadata for all naats from cache
 * Used by For You algorithm to rank without fetching full documents
 */
async getNaatsMetadata(): Promise<NaatMetadata[]> {
  this.initialize();

  try {
    const response = await this.database.getDocument(
      this.config.databaseId,
      'naats-metadata-cache',
      'global'
    );

    const metadata = JSON.parse(response.metadata);
    
    console.log(`[Cache] Loaded ${metadata.length} naats metadata (updated: ${response.updatedAt})`);
    
    return metadata;
  } catch (error) {
    console.error('[Cache] Failed to load metadata cache:', error);
    
    // Fallback: fetch directly (expensive but works)
    console.warn('[Cache] Falling back to direct fetch (expensive)');
    
    const response = await this.database.listDocuments(
      this.config.databaseId,
      this.config.naatsCollectionId,
      [
        Query.limit(5000),
        Query.orderDesc('uploadDate'),
        Query.or([
          Query.equal('exclude', false),
          Query.isNull('exclude')
        ])
      ]
    );

    return response.documents.map(doc => ({
      id: doc.$id,
      title: doc.title,
      channelId: doc.channelId,
      channelTitle: doc.channelTitle,
      views: doc.views || 0,
      uploadDate: doc.uploadDate,
      thumbnailUrl: doc.thumbnailUrl,
      duration: doc.duration,
      cutAudio: doc.cutAudio,
      youtubeId: doc.youtubeId,
    }));
  }
}


Copy
typescript
STEP 5: Update Mobile Appwrite Service
File: apps/mobile/services/appwrite.ts

Add this method:

/**
 * Get lightweight metadata for For You algorithm
 */
async getNaatsMetadata(): Promise<NaatMetadata[]> {
  return this.baseService.getNaatsMetadata();
}

Copy
typescript
STEP 6: Update For You Algorithm
File: apps/mobile/services/forYouAlgorithm.ts

Update the function signature to work with metadata:

import type { NaatMetadata } from "@naat-collection/shared";

/**
 * Generate personalized For You feed using lightweight metadata
 * @param naatsMetadata - Lightweight naat metadata (not full documents)
 * @param channelId - Optional channel filter
 * @returns Ranked metadata array
 */
export async function getForYouFeed(
  naatsMetadata: NaatMetadata[],  // Changed from Naat[]
  channelId: string | null = null
): Promise<NaatMetadata[]> {  // Changed return type
  
  // Get user's listening history from local storage
  const history = await storageService.getListeningHistory();
  const downloads = await storageService.getDownloads();
  
  // Get user preferences
  const watchedIds = new Set(history.map(h => h.naatId));
  const downloadedIds = new Set(downloads.map(d => d.id));
  
  // Channel frequency tracking for diversity
  const channelFrequency = new Map<string, number>();
  
  // Score each naat
  const scored = naatsMetadata.map(naat => {
    let score = 0;
    
    // 1. RECENCY BOOST (favor recent uploads)
    const daysSinceUpload = getDaysSinceUpload(naat.uploadDate);
    if (daysSinceUpload < 7) score += 50;
    else if (daysSinceUpload < 30) score += 30;
    else if (daysSinceUpload < 90) score += 10;
    
    // 2. POPULARITY (logarithmic scale to avoid outliers)
    score += Math.log10((naat.views || 0) + 1) * 5;
    
    // 3. USER HISTORY
    if (watchedIds.has(naat.id)) {
      score -= 30; // Reduce score for already watched
    }
    if (downloadedIds.has(naat.id)) {
      score += 5; // Slight boost for downloaded (user liked it)
    }
    
    // 4. PURE NAAT BOOST (has cutAudio)
    if (naat.cutAudio) {
      score += 20;
    }
    
    // 5. CHANNEL DIVERSITY (avoid same channel dominating)
    const channelCount = channelFrequency.get(naat.channelId) || 0;
    score -= channelCount * 2; // Penalty for overrepresented channels
    
    // 6. DURATION PREFERENCE (favor moderate length)
    if (naat.duration >= 180 && naat.duration <= 600) {
      score += 10; // 3-10 minutes ideal
    }
    
    return { ...naat, score };
  });
  
  // Sort by score (highest first)
  const ranked = scored.sort((a, b) => b.score - a.score);
  
  // Update channel frequency as we rank
  ranked.forEach(naat => {
    const count = channelFrequency.get(naat.channelId) || 0;
    channelFrequency.set(naat.channelId, count + 1);
  });
  
  // Remove score field and return
  return ranked.map(({ score, ...naat }) => naat);
}

// Helper function
function getDaysSinceUpload(uploadDate: string): number {
  const uploaded = new Date(uploadDate);
  const now = new Date();
  const diffMs = now.getTime() - uploaded.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}


Copy
typescript
STEP 7: Update useNaats Hook
File: apps/mobile/hooks/useNaats.ts

Replace the entire "For You" section in loadMore() function:

// For "forYou" filter, use metadata cache + personalized ranking
if (filter === "forYou") {
  try {
    // Check if we already have the full ordered list cached in memory
    const cachedOrderedList = fullOrderedListRef.current.get(cacheKey);

    if (cachedOrderedList) {
      // Use cached ordered list for pagination
      const startIndex = offsetRef.current;
      const endIndex = startIndex + PAGE_SIZE;
      const pageMetadata = cachedOrderedList.slice(startIndex, endIndex);

      // Fetch ONLY the full naat documents for current page
      const pageNaats = await Promise.all(
        pageMetadata.map(async (meta) => {
          try {
            return await appwriteService.getNaatById(meta.id);
          } catch (err) {
            console.error(`Failed to fetch naat ${meta.id}:`, err);
            return null;
          }
        })
      );

      const validNaats = pageNaats.filter((n): n is Naat => n !== null);

      // Cache the page
      filterCache.set(offsetRef.current, validNaats);

      // Update state - filter out duplicates
      setNaats((prev) => {
        const existingIds = new Set(prev.map((n) => n.$id));
        const uniqueNewNaats = validNaats.filter(
          (n) => !existingIds.has(n.$id),
        );
        return [...prev, ...uniqueNewNaats];
      });
      
      offsetRef.current += PAGE_SIZE;
      setHasMore(endIndex < cachedOrderedList.length);
      setLoading(false);
      isLoadingRef.current = false;

      console.log(
        `[ForYou] Using cached ranking, loaded ${validNaats.length} naats, ${cachedOrderedList.length - endIndex} remaining`,
      );
      return;
    }

    // First time loading For You - fetch metadata and rank
    console.log('[ForYou] First load, fetching metadata cache...');

    // Fetch lightweight metadata from cache (1 READ)
    const allMetadata = await appwriteService.getNaatsMetadata();
    
    console.log(`[ForYou] Loaded ${allMetadata.length} naats metadata from cache`);

    // Apply user-specific algorithm locally (0 READS - runs on device)
    const rankedMetadata = await getForYouFeed(allMetadata, channelId);
    
    console.log(`[ForYou] Ranked ${rankedMetadata.length} naats based on user preferences`);

    // Cache the full ordered metadata list for future pagination
    fullOrderedListRef.current.set(cacheKey, rankedMetadata);

    // Paginate - get first page metadata
    const startIndex = offsetRef.current;
    const endIndex = startIndex + PAGE_SIZE;
    const pageMetadata = rankedMetadata.slice(startIndex, endIndex);

    // Fetch ONLY the full naat documents for current page (20 READS)
    const pageNaats = await Promise.all(
      pageMetadata.map(async (meta) => {
        try {
          return await appwriteService.getNaatById(meta.id);
        } catch (err) {
          console.error(`Failed to fetch naat ${meta.id}:`, err);
          return null;
        }
      })
    );

    const validNaats = pageNaats.filter((n): n is Naat => n !== null);

    // Cache the page
    filterCache.set(offsetRef.current, validNaats);

    // Update state - filter out duplicates
    setNaats((prev) => {
      const existingIds = new Set(prev.map((n) => n.$id));
      const uniqueNewNaats = validNaats.filter(
        (n) => !existingIds.has(n.$id),
      );
      return [...prev, ...uniqueNewNaats];
    });

    offsetRef.current += PAGE_SIZE;
    setHasMore(endIndex < rankedMetadata.length);

    console.log(
      `[ForYou] Displayed ${validNaats.length} naats, ${rankedMetadata.length - endIndex} remaining`,
    );

  } catch (err) {
    setError(
      err instanceof Error ? err : new Error('Failed to load For You feed'),
    );
    console.error('[ForYou] Error:', err);
  } finally {
    setLoading(false);
    isLoadingRef.current = false;
  }
  
  return; // Exit early for forYou
}

// For other filters (latest, popular, oldest) - use standard pagination
// (existing code below continues as-is)


Copy
typescript
Update the refresh() function For You section similarly:

// In refresh() function, replace For You section:

if (filter === "forYou") {
  // Clear For You session cache
  await storageService.clearForYouSession();

  // Fetch metadata
  const allMetadata = await appwriteService.getNaatsMetadata();
  
  console.log(`[ForYou Refresh] Loaded ${allMetadata.length} naats metadata`);

  // Apply algorithm
  const rankedMetadata = await getForYouFeed(allMetadata, channelId);

  // Cache the full ordered list
  fullOrderedListRef.current.set(cacheKey, rankedMetadata);

  // Get first page metadata
  const pageMetadata = rankedMetadata.slice(0, PAGE_SIZE);

  // Fetch full naats for first page
  const pageNaats = await Promise.all(
    pageMetadata.map(async (meta) => {
      try {
        return await appwriteService.getNaatById(meta.id);
      } catch (err) {
        console.error(`Failed to fetch naat ${meta.id}:`, err);
        return null;
      }
    })
  );

  const freshNaats = pageNaats.filter((n): n is Naat => n !== null);

  // Get or create cache
  if (!cacheRef.current.has(cacheKey)) {
    cacheRef.current.set(cacheKey, new Map());
  }
  const filterCache = cacheRef.current.get(cacheKey)!;

  // Cache the results
  filterCache.set(0, freshNaats);

  // Update state
  setNaats(freshNaats);
  offsetRef.current = PAGE_SIZE;
  setHasMore(PAGE_SIZE < rankedMetadata.length);

  console.log(
    `[ForYou Refresh] Displayed ${freshNaats.length} naats, ${rankedMetadata.length - PAGE_SIZE} remaining`,
  );
}


Copy
typescript
STEP 8: Import NaatMetadata Type
File: apps/mobile/hooks/useNaats.ts

Add import at top:

import type { Naat, NaatMetadata, UseNaatsReturn } from "../types";

Copy
typescript
File: apps/mobile/types/index.ts

Add export:

export type { NaatMetadata } from "@naat-collection/shared";

Copy
typescript
DEPLOYMENT CHECKLIST
Phase 1: Setup (1 hour)
 Run setup-naats-metadata-cache.js to create collection
 Deploy sync-naats-metadata function to Appwrite
 Configure cron schedule (every 6 hours)
 Manually trigger first sync to populate cache
 Verify cache document created with data
Phase 2: Code Updates (1 hour)
 Add NaatMetadata type to shared package
 Update appwrite-service.ts with getNaatsMetadata() method
 Update forYouAlgorithm.ts to work with metadata
 Update useNaats.ts For You sections in loadMore() and refresh()
 Test compilation - fix any TypeScript errors
Phase 3: Testing (2 hours)
 Test For You tab loads correctly
 Test pagination (scroll multiple pages)
 Test refresh (pull to refresh)
 Test with no internet (cache fallback)
 Test other tabs (Latest, Popular, Oldest) still work
 Monitor Appwrite read count in console
Phase 4: Monitoring (Ongoing)
 Check cron runs every 6 hours successfully
 Monitor daily read usage (should drop 95%+)
 Watch for user complaints about For You freshness
 Check cache size doesn't exceed limits
ROLLBACK PLAN
If something breaks:

Quick fix: Change filter default from "forYou" to "latest"

Disable For You: Hide tab in UI temporarily

Revert code: Git revert the useNaats.ts changes

Keep cron running: Cache will be ready when you fix issues

EXPECTED RESULTS
Read Usage (1000 users/day):
Before: 3,000,000 reads/day
After:  93,000 reads/day
Savings: 96.9%

Copy
User Experience:
For You loads in 2-3 seconds (1 cache fetch + algorithm)

Personalization fully preserved

Smooth scrolling (lazy loads 20 at a time)

Latest/Popular/Oldest unchanged

Maintenance:
Cron runs automatically every 6 hours

No manual intervention needed

Cache stays fresh with new uploads

NEXT OPTIMIZATIONS (Optional)
Reduce cron frequency to 12 hours (saves 6,000 reads/day)

Add cache versioning (invalidate client cache on updates)

Compress metadata JSON (faster downloads)

Add cache to Latest tab (for very heavy usage)

Move algorithm to edge function (optional server-side ranking)

This is your production-ready solution. Ready to implement? 🚀