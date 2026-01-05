# Video Ingestion Function - Quick Reference

## Essential Commands

```bash
# Deploy function
cd functions/ingest-videos
appwrite deploy function

# Manual execution
appwrite functions createExecution --functionId=ingest-videos

# View function details
appwrite functions get --functionId=ingest-videos

# View recent executions
appwrite functions listExecutions --functionId=ingest-videos

# Local testing
node test-local.js
```

## Required Environment Variables

| Variable                       | Where to Get It                                      |
| ------------------------------ | ---------------------------------------------------- |
| `APPWRITE_API_KEY`             | Appwrite Console → Settings → API Keys               |
| `APPWRITE_DATABASE_ID`         | Appwrite Console → Databases → Your DB → Settings    |
| `APPWRITE_NAATS_COLLECTION_ID` | Appwrite Console → Databases → Naats → Settings      |
| `YOUTUBE_CHANNEL_ID`           | YouTube channel URL or YouTube Studio                |
| `YOUTUBE_API_KEY`              | Google Cloud Console → APIs & Services → Credentials |

## Cron Schedule Examples

| Expression     | Meaning                      |
| -------------- | ---------------------------- |
| `0 2 * * *`    | Daily at 2 AM UTC            |
| `0 */6 * * *`  | Every 6 hours                |
| `0 0 * * 0`    | Weekly on Sunday at midnight |
| `0 0 1 * *`    | Monthly on the 1st           |
| `*/30 * * * *` | Every 30 minutes             |

## Function Response Format

```json
{
  "success": true,
  "results": {
    "processed": 50, // Total videos found on YouTube
    "added": 5, // New videos added to database
    "skipped": 45, // Existing videos (duplicates)
    "errors": [] // Array of error messages
  }
}
```

## Common Issues & Quick Fixes

| Issue             | Quick Fix                                                  |
| ----------------- | ---------------------------------------------------------- |
| Missing env vars  | Update `appwrite.json` and redeploy                        |
| YouTube API 403   | Check API key and quota in Google Cloud Console            |
| Channel not found | Verify channel ID is correct and channel is public         |
| Timeout           | Increase timeout in `appwrite.json` or reduce `maxResults` |
| Quota exceeded    | Wait for quota reset or request increase                   |

## YouTube API Quota

- **Daily Limit**: 10,000 units
- **Cost per video**: ~3-5 units
- **Capacity**: ~2,000-3,000 videos/day
- **Reset Time**: Midnight Pacific Time

## File Structure

```
functions/ingest-videos/
├── src/main.js              # Main function code
├── package.json             # Dependencies
├── appwrite.json            # Configuration
├── .env.example             # Environment template
├── test-local.js            # Local testing script
├── deploy.sh                # Deployment helper
├── README.md                # Full documentation
├── SETUP_GUIDE.md           # Step-by-step setup
└── QUICK_REFERENCE.md       # This file
```

## Monitoring Checklist

- [ ] Check execution logs in Appwrite Console
- [ ] Verify videos appear in Naats collection
- [ ] Monitor YouTube API quota usage
- [ ] Check for error messages in logs
- [ ] Verify cron schedule is running as expected

## Support Resources

- [Full Documentation](./README.md)
- [Setup Guide](./SETUP_GUIDE.md)
- [Appwrite Docs](https://appwrite.io/docs/functions)
- [YouTube API Docs](https://developers.google.com/youtube/v3)
