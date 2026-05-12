# Fix Cut Status Script

## Purpose
This script fixes inconsistent data in the database where documents have `cutStatus: "done"` but `cutAudio: null`. It sets `cutStatus` to `null` for all such documents.

## Prerequisites

1. **Node.js** installed
2. **Environment variables** configured in a `.env` file at the project root

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

```env
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_NAATS_COLLECTION_ID=your_naats_collection_id
```

## Installation

Install the required dependencies:

```bash
npm install node-appwrite dotenv
```

## Usage

Run the script from the project root:

```bash
node scripts/audio-processing/fix-cut-status.js
```

## What It Does

1. Queries the database for all documents where:
   - `cutAudio` is `null`
   - `cutStatus` is `"done"`

2. For each matching document:
   - Updates `cutStatus` to `null`
   - Logs the progress

3. Processes documents in batches of 100 to handle large datasets efficiently

## Output

The script will display:
- Number of documents found in each batch
- Details of each document being processed
- Success/failure status for each update
- Total number of documents fixed

## Example Output

```
🔧 Fixing cutStatus for documents with null cutAudio...

Batch 1: Found 15 documents with inconsistent state

Processing: Beautiful Naat Title
  ID: 123abc
  cutAudio: null
  cutStatus: done
  ✅ cutStatus set to null

...

✅ Complete! Fixed 15 documents.
```

## Safety

- The script only updates the `cutStatus` field
- It does not modify or delete any audio files
- Changes can be manually reverted if needed by setting `cutStatus` back to `"done"`
