# Phase 1 Setup - Quick Start Guide

## What's Changed?

1. **Database**: Added `isOfficial` and `isOther` boolean attributes to channels collection
2. **Ingestion Function**: Now reads channels from database instead of environment variables
3. **Filtering Logic**: Uses `isOfficial` flag to determine which videos to ingest

## Setup Steps (5 minutes)

### Step 1: Add New Attributes to Channels Collection

```bash
node scripts/setup/add-channel-attributes.js
```

This adds `isOfficial` and `isOther` attributes to your existing channels collection.

### Step 2: Configure Channel Flags

Edit `scripts/data-management/update-channel-flags.js` and update the `CHANNEL_CONFIG` array:

```javascript
const CHANNEL_CONFIG = [
  {
    channelId: "UC-pKQ46ZSMkveYV7nKijWmQ", // Baghdadi Sound & Video
    isOfficial: false, // Filter for Owais only
    isOther: false, // Main channel
  },
  {
    channelId: "UCyvdo5fpPSnidSsM-c7F9wg", // Your other channel
    isOfficial: true, // Ingest all videos
    isOther: false, // Main channel
  },
  // Add more channels as needed
];
```

Then run:

```bash
node scripts/data-management/update-channel-flags.js
```

### Step 3: Update Appwrite Function Environment

In your Appwrite console (Functions → ingest-videos → Settings → Environment Variables):

**Add:**

- `APPWRITE_CHANNELS_COLLECTION_ID` = `channels` (or your collection ID)

**Remove (no longer needed):**

- `YOUTUBE_CHANNEL_IDS`
- `YOUTUBE_CHANNEL_ID`

### Step 4: Redeploy Ingestion Function

The function code has been updated. Redeploy it:

```bash
# Option 1: Using Appwrite CLI
appwrite deploy function

# Option 2: Manually in Appwrite console
# Go to Functions → ingest-videos → Upload the updated code
```

### Step 5: Test

Trigger the function manually and check logs:

```
✅ "Fetching channels from database..."
✅ "Found X channel(s) to process"
✅ "Processing channel: ... (Official)" or "(Non-official)"
```

## Quick Reference

### Channel Flag Meanings

| isOfficial | isOther | Behavior                                   |
| ---------- | ------- | ------------------------------------------ |
| `true`     | `false` | Main channel tab, ingest ALL videos        |
| `false`    | `false` | Main channel tab, ingest ONLY Owais videos |
| `true`     | `true`  | "Other" tab, ingest ALL videos             |
| `false`    | `true`  | "Other" tab, ingest ONLY Owais videos      |

### Files Modified

- ✅ `functions/ingest-videos/src/main.js` - Updated ingestion logic
- ✅ `scripts/setup/setup-channels-collection.js` - Added new attributes
- ✅ `scripts/setup/add-channel-attributes.js` - NEW: Add attributes to existing collection
- ✅ `scripts/data-management/update-channel-flags.js` - NEW: Update channel flags

## Troubleshooting

**Error: "No channels found in database"**
→ Run `node scripts/data-management/add-channels.js` first

**Error: "Missing required environment variables: APPWRITE_CHANNELS_COLLECTION_ID"**
→ Add the environment variable in Appwrite console and redeploy

**Videos not filtering correctly**
→ Check channel flags in database, verify `isOfficial` is set correctly

## What's Next?

Phase 1 is complete! The backend is now ready.

**Phase 2** will update the frontend to:

- Fetch channels with new attributes
- Group channels with `isOther = true` into an "Other" tab
- Display: Channel 1, Channel 2, ..., Other

See `docs/PHASE_1_CHANNEL_FLAGS.md` for detailed documentation.
