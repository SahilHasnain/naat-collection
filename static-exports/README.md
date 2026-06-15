# Static Exports - Fallback Data

This directory contains static JSON exports of the Appwrite database for use as a fallback when database read limits are exceeded.

## Files

- **`naats-export.json`** - All naats with full metadata
- **`channels-export.json`** - All channels

## Purpose

When Appwrite database read limits are exhausted, the app will automatically fall back to these static files served via jsDelivr CDN.

## CDN URLs

After pushing to GitHub, these files are accessible via:

```
https://cdn.jsdelivr.net/gh/USERNAME/naat-collection@main/static-exports/naats-export.json
https://cdn.jsdelivr.net/gh/USERNAME/REPO@main/static-exports/channels-export.json
```

Replace `USERNAME` and `REPO` with your GitHub details.

## How to Update

When database limits reset (monthly), refresh the exports:

```bash
# Run export script
node scripts/export-naats-to-json.js

# Commit and push
git add static-exports/
git commit -m "Update static exports - $(date +%Y-%m-%d)"
git push
```

jsDelivr will automatically pick up the new files within 24 hours. To force immediate update, purge the CDN cache at: https://www.jsdelivr.com/tools/purge

## File Format

### naats-export.json

```json
{
  "metadata": {
    "exportedAt": "2024-01-15T10:30:00.000Z",
    "totalItems": 3000,
    "version": "1.0",
    "source": "Appwrite Database"
  },
  "data": [
    {
      "$id": "...",
      "title": "...",
      "channelId": "...",
      "uploadDate": "...",
      ...
    }
  ]
}
```

## Size Estimate

- **naats-export.json**: ~3-5 MB (3000 naats)
- **channels-export.json**: ~50-100 KB

## Caching

jsDelivr automatically caches files globally. Cache duration: 7 days for main branch.

## Notes

- Data in these files is a snapshot and may be outdated
- Users will see a banner when fallback mode is active
- Audio files still served from Appwrite Storage
- This only reduces database read load, not bandwidth
