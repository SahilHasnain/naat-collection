# Phase 1: Channel Flags & Database-Driven Ingestion

## Overview

This phase adds two new boolean attributes to the channels collection and updates the ingestion function to use channels from the database instead of hardcoded channel IDs.

## New Channel Attributes

### `isOfficial` (Boolean, Required, Default: true)

- **true**: Official channel - ingest ALL videos from this channel
- **false**: Non-official channel - ingest ONLY videos with "Owais Raza Qadri" in the title

### `isOther` (Boolean, Required, Default: false)

- **true**: Channel appears in "Other" tab in the frontend
- **false**: Channel appears as a main channel tab

## Changes Made

### 1. Database Schema Updates

#### New Scripts:

- `scripts/setup/add-channel-attributes.js` - Adds the new attributes to existing collection
- `scripts/data-management/update-channel-flags.js` - Updates existing channels with appropriate flags

#### Updated Scripts:

- `scripts/setup/setup-channels-collection.js` - Now includes the new attributes for fresh setups

### 2. Ingestion Function Updates

#### File: `functions/ingest-videos/src/main.js`

**Key Changes:**

- Now fetches channels from database instead of environment variables
- Uses `isOfficial` flag to determine filtering logic
- Removed hardcoded channel ID checks
- Added new function `getAllChannels()` to fetch channels from DB

**New Environment Variable Required:**

- `APPWRITE_CHANNELS_COLLECTION_ID` - Collection ID for channels

**Removed Environment Variables:**

- `YOUTUBE_CHANNEL_IDS` - No longer needed (channels come from DB)
- `YOUTUBE_CHANNEL_ID` - No longer needed (legacy support removed)

**Updated Filtering Logic:**

```javascript
// Before: Hardcoded channel ID check
if (channelId !== BAGHDADI_CHANNEL_ID) {
  return false;
}

// After: Database-driven flag check
if (isOfficial) {
  return false; // Don't filter official channels
}
```

## Setup Instructions

### For Existing Projects

1. **Add new attributes to channels collection:**

   ```bash
   node scripts/setup/add-channel-attributes.js
   ```

2. **Update existing channel documents with flags:**

   Edit `scripts/data-management/update-channel-flags.js` to configure your channels:

   ```javascript
   const CHANNEL_CONFIG = [
     {
       channelId: "UC-pKQ46ZSMkveYV7nKijWmQ",
       isOfficial: false, // Filter for Owais only
       isOther: false, // Main channel tab
     },
     {
       channelId: "UCyvdo5fpPSnidSsM-c7F9wg",
       isOfficial: true, // Ingest all videos
       isOther: false, // Main channel tab
     },
     // Add more channels...
   ];
   ```

   Then run:

   ```bash
   node scripts/data-management/update-channel-flags.js
   ```

3. **Update Appwrite Function Environment Variables:**

   In your Appwrite console, update the `ingest-videos` function:
   - Add: `APPWRITE_CHANNELS_COLLECTION_ID` (e.g., "channels")
   - Remove: `YOUTUBE_CHANNEL_IDS` (no longer needed)
   - Remove: `YOUTUBE_CHANNEL_ID` (no longer needed)

4. **Redeploy the ingestion function:**

   ```bash
   # If using Appwrite CLI
   appwrite deploy function

   # Or manually upload the updated function code
   ```

### For New Projects

1. **Create channels collection with new attributes:**

   ```bash
   node scripts/setup/setup-channels-collection.js
   ```

2. **Add channels to the collection:**

   Edit `scripts/data-management/add-channels.js` to include your channels, then:

   ```bash
   node scripts/data-management/add-channels.js
   ```

3. **Set channel flags:**

   Follow step 2 from "For Existing Projects" above.

4. **Configure and deploy function:**

   Follow steps 3-4 from "For Existing Projects" above.

## Testing

### Verify Channel Flags

Check your channels in Appwrite console:

- Navigate to Databases → Your Database → channels collection
- Verify each channel has `isOfficial` and `isOther` attributes set correctly

### Test Ingestion Function

1. **Trigger the function manually** (via Appwrite console or API)

2. **Check the logs** for:
   - "Fetching channels from database..."
   - "Found X channel(s) to process"
   - For each channel: "(Official)" or "(Non-official)"
   - Filtered video counts

3. **Verify results:**
   - Official channels: All videos should be ingested
   - Non-official channels: Only Owais Raza Qadri videos should be ingested

### Example Log Output

```
Starting video ingestion process...
Fetching channels from database...
Fetched 2 channels from database
Found 2 channel(s) to process
Processing channel: UC-pKQ46ZSMkveYV7nKijWmQ (Non-official)
Found 500 videos for channel: Baghdadi Sound & Video
Filtered: Some Other Naat (non-Owais from non-official channel)
Added new video: Owais Raza Qadri - Beautiful Naat
Processing channel: UCyvdo5fpPSnidSsM-c7F9wg (Official)
Found 300 videos for channel: Official Channel
Added new video: Any Naat Title
```

## Channel Configuration Examples

### Example 1: Main Official Channel

```javascript
{
  channelId: "UCxxxxxxxxxxxxx",
  isOfficial: true,  // Ingest all videos
  isOther: false,    // Show as main tab
}
```

### Example 2: Non-Official Channel (Filter for Owais)

```javascript
{
  channelId: "UC-pKQ46ZSMkveYV7nKijWmQ",
  isOfficial: false, // Filter for Owais only
  isOther: false,    // Show as main tab
}
```

### Example 3: Official Channel in "Other" Tab

```javascript
{
  channelId: "UCyyyyyyyyyyyyyy",
  isOfficial: true,  // Ingest all videos
  isOther: true,     // Show in "Other" tab
}
```

## Troubleshooting

### "No channels found in database"

- Run `node scripts/data-management/add-channels.js` to add channels
- Verify `APPWRITE_CHANNELS_COLLECTION_ID` is set correctly

### "Missing required environment variables: APPWRITE_CHANNELS_COLLECTION_ID"

- Add the environment variable to your Appwrite function settings
- Redeploy the function

### Videos not being filtered correctly

- Check channel flags in database
- Verify `isOfficial` is set correctly for each channel
- Check function logs for filtering messages

## Next Steps

After completing Phase 1:

- ✅ Database schema updated with new attributes
- ✅ Ingestion function uses database-driven channel configuration
- ✅ Filtering logic based on `isOfficial` flag

**Ready for Phase 2:** Frontend updates to display channels with "Other" tab grouping.
