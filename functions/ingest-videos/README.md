# Video Ingestion Function

This Appwrite Function automatically fetches naat videos from a YouTube channel and stores them in the Appwrite database. It runs on a scheduled basis (cron job) to keep the content library updated.

## Features

- Fetches videos from a specified YouTube channel
- Extracts video metadata (title, URL, thumbnail, duration, youtubeId)
- Checks for duplicates using youtubeId to prevent duplicate entries
- Inserts new videos into the Naats collection
- Comprehensive error logging for failed ingestions
- Scheduled execution via cron trigger (daily at 2 AM by default)

## Prerequisites

1. **Appwrite Project**: You need an existing Appwrite project with the Naats collection set up
2. **YouTube Data API Key**: Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable YouTube Data API v3
   - Create credentials (API Key)
3. **Appwrite CLI**: Install the [Appwrite CLI](https://appwrite.io/docs/command-line) for deployment

## Environment Variables

The function requires the following environment variables:

| Variable                       | Description                             | Required                                    |
| ------------------------------ | --------------------------------------- | ------------------------------------------- |
| `APPWRITE_ENDPOINT`            | Appwrite API endpoint                   | Yes (default: https://cloud.appwrite.io/v1) |
| `APPWRITE_API_KEY`             | API key with database write permissions | Yes                                         |
| `APPWRITE_DATABASE_ID`         | Database ID                             | Yes                                         |
| `APPWRITE_NAATS_COLLECTION_ID` | Naats collection ID                     | Yes                                         |
| `YOUTUBE_CHANNEL_ID`           | YouTube channel ID to fetch videos from | Yes                                         |
| `YOUTUBE_API_KEY`              | YouTube Data API v3 key                 | Yes                                         |
| `RECITER_NAME`                 | Name of the reciter                     | No (default: "Unknown Reciter")             |
| `RECITER_ID`                   | ID of the reciter                       | No (default: "default-reciter")             |

## Setup Instructions

### 1. Get YouTube Channel ID

To find a YouTube channel ID:

1. Go to the YouTube channel page
2. Click on the channel name
3. Look at the URL - the channel ID is after `/channel/`
   - Example: `https://youtube.com/channel/UC1234567890abcdefg`
   - Channel ID: `UC1234567890abcdefg`

Alternatively, use the channel's custom URL and look it up using the YouTube API.

### 2. Configure Environment Variables

Edit the `appwrite.json` file and fill in the required environment variables:

```json
{
  "variables": {
    "APPWRITE_ENDPOINT": "https://cloud.appwrite.io/v1",
    "APPWRITE_API_KEY": "your-api-key-here",
    "APPWRITE_DATABASE_ID": "your-database-id",
    "APPWRITE_NAATS_COLLECTION_ID": "your-collection-id",
    "YOUTUBE_CHANNEL_ID": "your-youtube-channel-id",
    "YOUTUBE_API_KEY": "your-youtube-api-key",
    "RECITER_NAME": "Reciter Name",
    "RECITER_ID": "reciter-id"
  }
}
```

### 3. Deploy the Function

Using Appwrite CLI:

```bash
# Login to Appwrite
appwrite login

# Initialize the project (if not already done)
appwrite init project

# Deploy the function
appwrite deploy function

# Or deploy this specific function
cd functions/ingest-videos
appwrite deploy function
```

### 4. Configure Cron Schedule

The function is configured to run daily at 2 AM UTC by default. The cron expression is:

```
0 2 * * *
```

You can modify this in `appwrite.json` under the `schedule` field. Common cron patterns:

- `0 2 * * *` - Daily at 2 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight

### 5. Manual Execution (Testing)

You can manually trigger the function for testing:

```bash
# Using Appwrite CLI
appwrite functions createExecution --functionId=ingest-videos

# Or via the Appwrite Console
# Go to Functions > Ingest Videos > Execute
```

## API Response

The function returns a JSON response with the following structure:

```json
{
  "success": true,
  "results": {
    "processed": 50,
    "added": 5,
    "skipped": 45,
    "errors": []
  }
}
```

- `processed`: Total number of videos fetched from YouTube
- `added`: Number of new videos added to the database
- `skipped`: Number of videos that already existed (duplicates)
- `errors`: Array of error messages for failed operations

## Error Handling

The function implements comprehensive error handling:

1. **Environment Validation**: Checks for all required environment variables before execution
2. **YouTube API Errors**: Catches and logs YouTube API failures
3. **Database Errors**: Handles duplicate checking and insertion failures
4. **Individual Video Errors**: Continues processing remaining videos if one fails
5. **Detailed Logging**: All errors are logged with context for debugging

## Monitoring

Monitor the function execution:

1. **Appwrite Console**: View execution logs in Functions > Ingest Videos > Executions
2. **Logs**: Check the function logs for detailed information about each run
3. **Errors**: Review the `errors` array in the response for failed operations

## Troubleshooting

### Function fails with "Missing required environment variables"

- Verify all environment variables are set in `appwrite.json`
- Redeploy the function after updating variables

### YouTube API quota exceeded

- YouTube Data API has daily quotas (10,000 units by default)
- Each video fetch uses approximately 3-5 units
- Consider reducing `maxResults` or execution frequency

### Videos not appearing in the app

- Check function execution logs for errors
- Verify the Naats collection permissions allow read access
- Ensure the collection ID matches in both the function and mobile app

### Duplicate videos being added

- Verify the `youtubeId_unique` index exists on the collection
- Check that the duplicate checking logic is working correctly

## Development

To test the function locally:

```bash
# Install dependencies
cd functions/ingest-videos
npm install

# Set environment variables
export APPWRITE_FUNCTION_PROJECT_ID="your-project-id"
export APPWRITE_API_KEY="your-api-key"
# ... set other variables

# Run the function (requires Appwrite CLI)
appwrite functions createExecution --functionId=ingest-videos
```

## YouTube Data API Costs

The YouTube Data API is free but has quota limits:

- **Default Quota**: 10,000 units per day
- **Cost per video fetch**: ~3-5 units
- **Estimated capacity**: ~2,000-3,000 videos per day

If you need higher quotas, you can request an increase from Google Cloud Console.

## Future Enhancements

Potential improvements for future versions:

- Support for multiple YouTube channels
- Incremental updates (only fetch videos since last run)
- Video metadata updates (handle title/thumbnail changes)
- Webhook support for real-time ingestion
- Support for other video platforms (Vimeo, etc.)
- Video categorization and tagging
- Automatic reciter detection from video metadata

## License

This function is part of the Naat Platform project.
