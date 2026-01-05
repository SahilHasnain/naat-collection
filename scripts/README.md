# Appwrite Backend Setup

This directory contains scripts for setting up and managing the Appwrite backend for the Naat Platform.

## Prerequisites

Before running the setup script, ensure you have:

1. **Node.js** installed (v18 or higher recommended)
2. **Appwrite Cloud account** or self-hosted Appwrite instance
3. **Appwrite project created** via the Appwrite console
4. **Database created** in your Appwrite project

## Initial Setup Steps

### 1. Create Appwrite Project

1. Go to [Appwrite Cloud Console](https://cloud.appwrite.io/) or your self-hosted instance
2. Click "Create Project"
3. Enter a project name (e.g., "Naat Platform")
4. Copy the **Project ID** - you'll need this for configuration

### 2. Create Database

1. In your Appwrite project, navigate to "Databases"
2. Click "Create Database"
3. Enter a database name (e.g., "naat-platform-db")
4. Copy the **Database ID** - you'll need this for configuration

### 3. Get API Key

1. In your Appwrite project, navigate to "Settings" → "API Keys"
2. Click "Create API Key"
3. Give it a name (e.g., "Server Key")
4. Set the following scopes:
   - `databases.read`
   - `databases.write`
   - `collections.read`
   - `collections.write`
   - `attributes.read`
   - `attributes.write`
   - `indexes.read`
   - `indexes.write`
   - `documents.read`
   - `documents.write`
5. Copy the **Secret Key** - you'll need this for configuration

### 4. Configure Environment Variables

Update your `.env.local` file with the values from above:

```bash
# Appwrite Configuration
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1  # or your endpoint
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_APPWRITE_DATABASE_ID=your_database_id_here
EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID=your_naats_collection_id  # Will be auto-filled by script

# Server-side only (for Appwrite Functions and scripts)
APPWRITE_SECRET_KEY=your_secret_api_key_here

# YouTube Configuration (for ingestion service)
YOUTUBE_CHANNEL_ID=your_youtube_channel_id_here
```

## Running the Setup Script

### Install Dependencies

First, make sure you have the required dependencies:

```bash
npm install node-appwrite dotenv
```

### Run the Script

Execute the setup script from the project root:

```bash
node scripts/setup-appwrite.js
```

The script will:

1. ✅ Validate your environment configuration
2. 📦 Create the "Naats" collection
3. 📝 Create all required attributes:
   - `title` (string, 500 chars, required)
   - `videoUrl` (string, 1000 chars, required)
   - `thumbnailUrl` (string, 1000 chars, required)
   - `duration` (integer, required)
   - `uploadDate` (datetime, required)
   - `reciterName` (string, 200 chars, required)
   - `reciterId` (string, 100 chars, required)
   - `youtubeId` (string, 50 chars, required)
4. 🔍 Create indexes for search and performance:
   - Full-text search on `title`
   - Unique index on `youtubeId`
   - Descending index on `uploadDate`
   - Index on `reciterId`
5. 📝 Update `.env.local` with the collection ID

### Expected Output

```
🚀 Starting Appwrite Database Setup

═══════════════════════════════════════════════════════════
✅ Configuration validated
✅ Appwrite client initialized

📦 Creating Naats collection...
✅ Collection created with ID: 695bba86001b50478ed4

📝 Creating attributes...

   Creating string attribute: title
   ✅ Attribute 'title' created
   ⏳ Waiting for attribute 'title' to be ready...
   ✅ Attribute 'title' is ready

   [... more attributes ...]

✅ All attributes created successfully

🔍 Creating indexes...

   Creating fulltext index: title_search
   ✅ Index 'title_search' created
      Full-text search on title

   [... more indexes ...]

✅ All indexes created successfully

📝 Updating .env.local file...
✅ .env.local updated with collection ID

═══════════════════════════════════════════════════════════
🎉 Setup completed successfully!

📋 Summary:
   Database ID: 695bba86001b50478ed4
   Collection ID: 695bba86001b50478ed5
   Collection Name: Naats

📝 Next steps:
   1. Verify the collection in your Appwrite console
   2. Test the API by running your app
   3. Set up the video ingestion function (Task 12)
```

## Troubleshooting

### Error: Missing required environment variables

Make sure all required variables are set in `.env.local`:

- `EXPO_PUBLIC_APPWRITE_ENDPOINT`
- `EXPO_PUBLIC_APPWRITE_PROJECT_ID`
- `EXPO_PUBLIC_APPWRITE_DATABASE_ID`
- `APPWRITE_SECRET_KEY`

### Error: Invalid API key

Ensure your API key has the correct scopes (see step 3 above).

### Error: Attribute did not become available in time

This can happen if Appwrite is slow to process attributes. The script waits up to 60 seconds per attribute. If this persists:

1. Check your Appwrite console to see if attributes are being created
2. Try running the script again
3. Check your network connection

### Error: Collection already exists

If you need to recreate the collection:

1. Delete the existing collection in the Appwrite console
2. Run the script again

## Collection Schema

### Naats Collection

| Attribute    | Type     | Size | Required | Description                       |
| ------------ | -------- | ---- | -------- | --------------------------------- |
| title        | string   | 500  | Yes      | Title of the naat                 |
| videoUrl     | string   | 1000 | Yes      | URL to the video file             |
| thumbnailUrl | string   | 1000 | Yes      | URL to the thumbnail image        |
| duration     | integer  | -    | Yes      | Duration in seconds               |
| uploadDate   | datetime | -    | Yes      | Date the video was uploaded       |
| reciterName  | string   | 200  | Yes      | Name of the reciter               |
| reciterId    | string   | 100  | Yes      | Unique identifier for the reciter |
| youtubeId    | string   | 50   | Yes      | YouTube video ID (unique)         |

### Indexes

| Index Name       | Type     | Attributes        | Description                        |
| ---------------- | -------- | ----------------- | ---------------------------------- |
| title_search     | Fulltext | title             | Enables full-text search on titles |
| youtubeId_unique | Unique   | youtubeId         | Prevents duplicate videos          |
| uploadDate_desc  | Key      | uploadDate (DESC) | Optimizes sorting by date          |
| reciterId_index  | Key      | reciterId         | Optimizes filtering by reciter     |

### Permissions

The collection is configured with:

- **Read**: Any (public read access)
- **Write**: None (write access only via API key)
- **Document Security**: Disabled (collection-level permissions apply)

## Collection Permissions Configuration

The collection is set up with read-only access for the mobile app:

```javascript
permissions: [Permission.read(Role.any())];
```

This means:

- ✅ Anyone can read documents (no authentication required)
- ❌ Only server-side code with API key can create/update/delete documents
- ✅ Perfect for a public content platform

## Next Steps

After running this setup script:

1. **Verify in Appwrite Console**
   - Go to your Appwrite project
   - Navigate to Databases → Your Database → Naats collection
   - Verify all attributes and indexes are created

2. **Test the API**
   - Run your React Native app
   - The app should now be able to fetch data (though the collection is empty)

3. **Add Sample Data** (optional for testing)
   - Manually add a few documents via the Appwrite console
   - Or proceed to Task 12 to set up the video ingestion function

4. **Set Up Video Ingestion** (Task 12)
   - Create an Appwrite Function to automatically fetch videos from YouTube
   - Configure it to run on a schedule (e.g., daily)

## Related Files

- `../config/appwrite.ts` - Appwrite configuration for the mobile app
- `../services/appwrite.ts` - Appwrite service layer
- `../.env.local` - Environment variables (not committed to git)
- `../.env.example` - Example environment variables template
