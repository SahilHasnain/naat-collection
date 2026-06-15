# Radio Fallback System

## Overview

The live radio system implements a **2-layer fallback architecture** to handle Appwrite database quota exhaustion (402/429 errors).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      LAYER 1: DATABASE                      │
│                      (Always Try First)                     │
│                                                             │
│  ✅ Full metadata (title, duration)                         │
│  ✅ Filters (radio=true, exclude=false)                     │
│  ❌ Cost: 5000 reads                                        │
│  ❌ Can hit quota limits (402/429)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Success? Use it! │
                    └─────────┬─────────┘
                              │
                         ❌ Failed (402/429)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              LAYER 2: CONFIGURABLE FALLBACK                 │
│                 (FALLBACK_SOURCE env var)                   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌──────────────────┐          ┌──────────────────┐
    │  STORAGE_API     │          │  STATIC_JSON     │
    │  (Default)       │          │  (Future)        │
    ├──────────────────┤          ├──────────────────┤
    │ ⚠️ No metadata    │          │ ✅ Has metadata   │
    │ ⚠️ All files      │          │ ✅ Filtered data  │
    │ ✅ Cost: ~50 reads│          │ ✅ Cost: 0 reads  │
    │ ✅ Works NOW      │          │ ❌ Needs export   │
    └──────────────────┘          └──────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Success? Use it! │
                    └─────────┬─────────┘
                              │
                         ❌ Still failed?
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            FINAL FALLBACK: LOCAL CACHE                      │
│                                                             │
│  Use cached playlist from previous successful fetch         │
│  If no cache exists, radio cannot start                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer Details

### Layer 1: Database (Appwrite Databases API)

**Default behavior - always tried first**

```javascript
databases.listDocuments(DATABASE_ID, NAATS_COLLECTION_ID, [
  Query.limit(5000),
  Query.equal("radio", true),
  Query.isNotNull("cutAudio"),
  // ... more filters
])
```

**Pros:**
- ✅ Full metadata: title, duration, channel
- ✅ Smart filtering: only radio-enabled naats
- ✅ Excludes blocked content
- ✅ Sorted and curated

**Cons:**
- ❌ **5000 reads** per fetch
- ❌ Subject to quota limits
- ❌ Returns 402 when quota exhausted

**Read Cost:** 5000 reads

---

### Layer 2A: Storage API (storage.listFiles)

**Current recommendation for immediate relief**

```javascript
storage.listFiles(AUDIO_BUCKET_ID, [
  Query.limit(100),
  Query.offset(0),
  Query.orderDesc('$createdAt') // Latest files first
])
```

**Configuration:**
```bash
FALLBACK_SOURCE=storage_api
STORAGE_API_MAX_FILES=1000  # Limit to latest 1000 files
```

**Pros:**
- ✅ **Only ~10 reads** for 1000 files (500x cheaper!)
- ✅ Works when database quota exhausted
- ✅ No export needed - works immediately
- ✅ Separate quota from database
- ✅ Gets latest uploaded files

**Cons:**
- ⚠️ **No metadata** - uses file names (YouTube IDs)
- ⚠️ **No filtering** - plays latest audio files only
- ⚠️ Can't exclude non-radio naats
- ⚠️ Default duration (5 minutes) for all tracks
- ⚠️ Limited to configured max files

**Read Cost:** ~10 reads (100 files per request, 10 requests for 1000 files)

**When to use:**
- ✅ Database quota exhausted RIGHT NOW
- ✅ Need immediate solution
- ✅ Don't mind playing latest uploads
- ✅ Acceptable to show YouTube IDs as titles
- ✅ Want to minimize reads further

**Configuration Options:**
```bash
# Conservative (500 files, ~5 reads)
STORAGE_API_MAX_FILES=500

# Balanced (1000 files, ~10 reads) - DEFAULT
STORAGE_API_MAX_FILES=1000

# More variety (2000 files, ~20 reads)
STORAGE_API_MAX_FILES=2000

# Maximum (5000 files, ~50 reads)
STORAGE_API_MAX_FILES=5000
```

**Output Example:**
```json
{
  "id": "695f45e3002155f46efc",
  "title": "9Nce2sc8TKo.m4a",
  "duration": 300,
  "source": "storage_api"
}
```

---

### Layer 2B: Static JSON Export

**Future solution - zero cost**

```javascript
axios.get(STATIC_JSON_URL)
```

**Configuration:**
```bash
FALLBACK_SOURCE=static_json
STATIC_JSON_URL=https://cdn.jsdelivr.net/gh/sahilhasnain/naat-collection@main/static-exports/radio-naats.json
```

**Pros:**
- ✅ **0 reads** - served from CDN
- ✅ Full metadata preserved
- ✅ Filtered data (radio=true)
- ✅ No Appwrite dependency
- ✅ Fast global CDN

**Cons:**
- ❌ Requires manual export
- ❌ Potentially stale data
- ❌ Need to update monthly
- ❌ Requires GitHub + jsDelivr setup

**Read Cost:** 0 reads

**When to use:**
- ✅ Long-term solution
- ✅ Want zero cost
- ✅ Can update exports monthly
- ✅ Have CI/CD pipeline

**Setup Required:**
1. Export database to JSON
2. Commit to GitHub
3. Use jsDelivr CDN URL
4. Update monthly when quota resets

---

## Configuration

### Environment Variables

```bash
# .env

# Which fallback to use when database fails
FALLBACK_SOURCE=storage_api
# Options: storage_api | static_json

# Limit for storage_api fallback (latest N files)
STORAGE_API_MAX_FILES=1000
# Options: 500 (~5 reads), 1000 (~10 reads), 2000 (~20 reads), 5000 (~50 reads)

# For static_json fallback
STATIC_JSON_URL=https://cdn.jsdelivr.net/gh/sahilhasnain/naat-collection@main/static-exports/radio-naats.json

# Appwrite config
AUDIO_BUCKET_ID=audio-files
```

---

## Cost Comparison

| Method | Reads Per Fetch | Monthly Reads | Cost | Metadata | Filtering |
|--------|----------------|---------------|------|----------|-----------|
| **Database** | 5,000 | 5,000+ | $$$ | ✅ Full | ✅ Yes |
| **Storage API (1000)** | ~10 | 10+ | $ | ❌ None | ❌ No |
| **Storage API (5000)** | ~50 | 50+ | $$ | ❌ None | ❌ No |
| **Static JSON** | 0 | 0 | Free | ✅ Full | ✅ Yes |
| **Local Cache** | 0 | 0 | Free | ✅ Cached | ✅ Cached |

---

## Usage Scenarios

### Scenario 1: Normal Operation (Database Works)
```
1. Try database ✅
2. Get 5000 filtered naats with metadata
3. Cache locally
4. Stream radio
```

### Scenario 2: Database Quota Exhausted (Current Issue)
```
1. Try database ❌ (402 error)
2. Fallback to storage API ✅
3. Get latest 1000 files (no metadata, ~10 reads)
4. Shuffle for variety
5. Cache locally
6. Stream radio (with YouTube IDs as titles)
```

### Scenario 3: Both Database + Storage Failed
```
1. Try database ❌
2. Fallback to storage API ❌
3. Load local cache ✅
4. Stream radio (from last successful fetch)
```

### Scenario 4: Everything Failed + No Cache
```
1. Try database ❌
2. Fallback to storage API ❌
3. Load local cache ❌
4. Exit with error 💀
```

---

## Testing

### Test Storage API Fallback

```bash
cd docker/live-radio
node test-storage-api.js
```

This will show:
- Total files available
- Read cost estimation
- File structure
- Sample playlist

### Test Full Fallback Chain

```bash
# Clear cache to force fresh fetch
CLEAR_AUDIO_CACHE_ON_START=true docker-compose up

# Watch logs for:
# [LAYER 1] Database attempt
# [LAYER 2] Fallback activation
# Success or failure messages
```

---

## Migration Path

### Phase 1: Immediate Relief (NOW)
```bash
# Use storage API fallback
FALLBACK_SOURCE=storage_api
```
- ✅ Works immediately
- ✅ 100x cheaper than database
- ⚠️ No metadata

### Phase 2: Setup Static Export (Next Month)
```bash
# 1. When quota resets, export database
node scripts/export-radio-naats.js

# 2. Commit to GitHub
git add static-exports/radio-naats.json
git commit -m "Export radio naats"
git push

# 3. Switch to static JSON
FALLBACK_SOURCE=static_json
STATIC_JSON_URL=https://cdn.jsdelivr.net/gh/sahilhasnain/naat-collection@main/static-exports/radio-naats.json
```
- ✅ Zero cost
- ✅ Full metadata
- ✅ Sustainable long-term

### Phase 3: Hybrid Approach (Best)
```bash
# Use database when available, static JSON when not
FALLBACK_SOURCE=static_json
```
- Database: Fresh data when quota available
- Static JSON: Zero-cost fallback
- Storage API: Emergency backup

---

## Monitoring

Watch for these log patterns:

**Database Success:**
```
🔄 [LAYER 1] Fetching playlist from Appwrite Database...
✅ Database fetch successful! 1234 naats
```

**Storage API Fallback:**
```
❌ [LAYER 1] Database fetch failed: AppwriteException
💡 Got 402 - Payment/quota exceeded on database
🔄 [LAYER 2] Falling back to Storage API (storage.listFiles)...
📦 Fetching latest 1000 files from storage bucket: audio-files
✅ Fallback successful! 1000 naats
💰 Storage reads used: ~10 reads
```

**Static JSON Fallback:**
```
🔄 [LAYER 2] Falling back to static JSON export...
📥 Fetching from: https://cdn.jsdelivr.net/...
✅ Fallback successful! 1200 naats
📦 Loaded from static export (updated: 2026-06-01)
```

**Cache Fallback:**
```
❌ [LAYER 2] Fallback (storage_api) also failed
🔄 [FINAL FALLBACK] Trying local cached playlist...
📦 Loaded 1234 naats from cache
```

---

## Troubleshooting

### Issue: Database 402 Error
**Solution:** Already configured! Storage API will activate automatically.

### Issue: Storage API Also Failing
**Causes:**
- Storage quota also exhausted
- API key invalid
- Network issues

**Solution:**
1. Check storage quota in Appwrite console
2. Switch to static JSON: `FALLBACK_SOURCE=static_json`
3. Or wait for cache fallback

### Issue: No Metadata in Titles
**This is expected** with storage_api fallback.

**Solutions:**
- Wait for monthly reset, use database
- Switch to static JSON export
- Accept YouTube IDs as temporary titles

### Issue: Playing Non-Radio Naats
**This is expected** with storage_api (no filtering).

**Solutions:**
- Switch to static JSON (has filters)
- Wait for database quota reset
- Manually curate storage bucket

---

## Summary

**Right Now (Immediate):**
```bash
FALLBACK_SOURCE=storage_api  # 10 reads for 1000 files, no metadata
STORAGE_API_MAX_FILES=1000
```

**Next Month (Sustainable):**
```bash
FALLBACK_SOURCE=static_json  # 0 reads, full metadata
```

**Best Practice:**
- Use database when quota available
- Fallback to static JSON when exhausted
- Keep local cache as final safety net

The system automatically handles all layers - just configure `FALLBACK_SOURCE` and let it work!
