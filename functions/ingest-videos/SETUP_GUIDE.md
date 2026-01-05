# Video Ingestion Function - Setup Guide

This guide walks you through setting up the video ingestion function from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [YouTube API Setup](#youtube-api-setup)
3. [Appwrite Setup](#appwrite-setup)
4. [Function Configuration](#function-configuration)
5. [Deployment](#deployment)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- ✅ An Appwrite account ([cloud.appwrite.io](https://cloud.appwrite.io))
- ✅ Appwrite CLI installed ([installation guide](https://appwrite.io/docs/command-line))
- ✅ A Google Cloud account for YouTube API access
- ✅ Node.js 18+ installed
- ✅ The Naats collection already created (run `npm run setup:appwrite` from project root)

## YouTube API Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "Naat Platform")
4. Click "Create"

### Step 2: Enable YouTube Data API v3

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "YouTube Data API v3"
3. Click on it and press "Enable"

### Step 3: Create API Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key (you'll need this later)
4. (Optional) Click "Restrict Key" to add restrictions:
   - **Application restrictions**: None (or HTTP referrers if you prefer)
   - **API restrictions**: Select "YouTube Data API v3"
5. Click "Save"

### Step 4: Find Your YouTube Channel ID

**Method 1: From Channel URL**

1. Go to your YouTube channel
2. Click on your profile picture → "Your channel"
3. Look at the URL: `https://youtube.com/channel/CHANNEL_ID_HERE`
4. Copy the channel ID

**Method 2: Using YouTube Studio**

1. Go to [YouTube Studio](https://studio.youtube.com/)
2. Click "Settings" → "Channel" → "Advanced settings"
3. Find "Channel ID" and copy it

**Method 3: Using the API**
If you have a custom URL, you can use the YouTube API to find the channel ID:

```bash
curl "https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=USERNAME&key=YOUR_API_KEY"
```

## Appwrite Setup

### Step 1: Get Appwrite Credentials

You need the following from your Appwrite project:

1. **Project ID**: Found in Appwrite Console → Settings → Project ID
2. **Database ID**: Found in Databases → Your Database → Settings
3. **Collection ID**: Found in Databases → Your Database → Naats Collection → Settings
4. **API Key**: Create one in Appwrite Console → Settings → API Keys

### Step 2: Create an API Key

1. Go to Appwrite Console → Your Project → Settings → API Keys
2. Click "Create API Key"
3. Name it "Video Ingestion Function"
4. Set expiration (or "Never" for testing)
5. Under "Scopes", enable:
   - `databases.read`
   - `databases.write`
6. Click "Create"
7. Copy the API key (you won't see it again!)

## Function Configuration

### Step 1: Update appwrite.json

Edit `functions/ingest-videos/appwrite.json`:

```json
{
  "projectId": "YOUR_PROJECT_ID",
  "projectName": "Naat Platform",
  "functions": [
    {
      "$id": "ingest-videos",
      "name": "Ingest Videos",
      "runtime": "node-21.0",
      "execute": [],
      "events": [],
      "schedule": "0 2 * * *",
      "timeout": 300,
      "enabled": true,
      "logging": true,
      "entrypoint": "src/main.js",
      "commands": "npm install",
      "path": "functions/ingest-videos",
      "variables": {
        "APPWRITE_ENDPOINT": "https://cloud.appwrite.io/v1",
        "APPWRITE_API_KEY": "YOUR_API_KEY_HERE",
        "APPWRITE_DATABASE_ID": "YOUR_DATABASE_ID",
        "APPWRITE_NAATS_COLLECTION_ID": "YOUR_COLLECTION_ID",
        "YOUTUBE_CHANNEL_ID": "YOUR_YOUTUBE_CHANNEL_ID",
        "YOUTUBE_API_KEY": "YOUR_YOUTUBE_API_KEY",
        "RECITER_NAME": "Your Reciter Name",
        "RECITER_ID": "your-reciter-id"
      }
    }
  ]
}
```

### Step 2: Configure Cron Schedule (Optional)

The default schedule is `0 2 * * *` (daily at 2 AM UTC). You can change this:

| Schedule       | Description        |
| -------------- | ------------------ |
| `0 2 * * *`    | Daily at 2 AM      |
| `0 */6 * * *`  | Every 6 hours      |
| `0 0 * * 0`    | Weekly on Sunday   |
| `0 0 1 * *`    | Monthly on the 1st |
| `*/30 * * * *` | Every 30 minutes   |

Use [crontab.guru](https://crontab.guru/) to create custom schedules.

## Deployment

### Step 1: Install Dependencies

```bash
cd functions/ingest-videos
npm install
```

### Step 2: Login to Appwrite CLI

```bash
appwrite login
```

Follow the prompts to authenticate.

### Step 3: Initialize Project (if not done)

```bash
# From project root
appwrite init project
```

Select your project from the list.

### Step 4: Deploy the Function

**Option A: Using the deployment script**

```bash
cd functions/ingest-videos
chmod +x deploy.sh
./deploy.sh
```

**Option B: Using Appwrite CLI directly**

```bash
cd functions/ingest-videos
appwrite deploy function
```

### Step 5: Verify Deployment

1. Go to Appwrite Console → Functions
2. You should see "Ingest Videos" function
3. Check that all environment variables are set
4. Verify the cron schedule is configured

## Testing

### Local Testing

1. Create a `.env` file:

```bash
cd functions/ingest-videos
cp .env.example .env
```

2. Edit `.env` with your credentials

3. Run the test script:

```bash
node test-local.js
```

### Manual Execution in Appwrite

1. Go to Appwrite Console → Functions → Ingest Videos
2. Click "Execute" button
3. Wait for execution to complete
4. Check the logs for results

### Using Appwrite CLI

```bash
appwrite functions createExecution --functionId=ingest-videos
```

### Verify Results

1. Go to Appwrite Console → Databases → Your Database → Naats Collection
2. You should see new documents with videos from YouTube
3. Check that all fields are populated correctly

## Troubleshooting

### "Missing required environment variables"

**Problem**: Function fails immediately with this error.

**Solution**:

1. Check `appwrite.json` has all required variables
2. Redeploy the function: `appwrite deploy function`
3. Verify variables in Appwrite Console → Functions → Ingest Videos → Settings

### "YouTube API error: 403"

**Problem**: YouTube API returns forbidden error.

**Solution**:

1. Verify your YouTube API key is correct
2. Check that YouTube Data API v3 is enabled in Google Cloud Console
3. Ensure API key restrictions allow YouTube Data API v3
4. Check your API quota hasn't been exceeded

### "Channel not found"

**Problem**: Function can't find the YouTube channel.

**Solution**:

1. Verify the channel ID is correct
2. Ensure the channel is public (not private)
3. Try accessing the channel URL directly: `https://youtube.com/channel/YOUR_CHANNEL_ID`

### "Failed to insert video: Duplicate entry"

**Problem**: Videos already exist in the database.

**Solution**:

- This is normal! The function skips duplicates automatically
- Check the function response for `skipped` count
- Verify the `youtubeId_unique` index exists on the collection

### Function times out

**Problem**: Function execution exceeds timeout limit.

**Solution**:

1. Increase timeout in `appwrite.json` (max 900 seconds)
2. Reduce the number of videos fetched (modify `maxResults` in code)
3. Check your network connection to YouTube API

### No videos are added

**Problem**: Function runs successfully but no videos appear.

**Solution**:

1. Check function logs for errors
2. Verify the YouTube channel has public videos
3. Check collection permissions allow read access
4. Verify the collection ID matches in both function and mobile app

### YouTube API quota exceeded

**Problem**: "quotaExceeded" error from YouTube API.

**Solution**:

1. YouTube Data API has a daily quota (10,000 units by default)
2. Each video fetch uses ~3-5 units
3. Wait until quota resets (midnight Pacific Time)
4. Request quota increase from Google Cloud Console
5. Reduce execution frequency or `maxResults`

## Monitoring

### View Execution Logs

1. Appwrite Console → Functions → Ingest Videos → Executions
2. Click on any execution to see detailed logs
3. Look for:
   - Number of videos processed
   - Number of videos added
   - Number of videos skipped
   - Any errors

### Check Function Status

```bash
appwrite functions list
appwrite functions get --functionId=ingest-videos
```

### Monitor API Usage

**YouTube API Quota**:

1. Go to Google Cloud Console
2. Navigate to "APIs & Services" → "Dashboard"
3. Click on "YouTube Data API v3"
4. View quota usage and limits

## Next Steps

After successful setup:

1. ✅ Verify videos appear in your mobile app
2. ✅ Monitor the first few scheduled executions
3. ✅ Adjust cron schedule if needed
4. ✅ Set up alerts for function failures (if available)
5. ✅ Document your specific channel and reciter information

## Support

If you encounter issues:

1. Check the [main README](./README.md) for detailed documentation
2. Review Appwrite Functions documentation
3. Check YouTube Data API documentation
4. Review function logs for specific error messages

## Additional Resources

- [Appwrite Functions Documentation](https://appwrite.io/docs/functions)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [Cron Expression Generator](https://crontab.guru/)
- [Appwrite Discord Community](https://appwrite.io/discord)
