# Database Check Script

This script checks how many naats in your Appwrite database don't contain "Owais Raza", "Owais Qadri", or "Owais Raza Qadri" in the title, specifically for the "Baghdadi Sound and Media" channel.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Make sure your `.env` file has the required Appwrite configuration:

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=your_endpoint
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID=your_collection_id
```

## Usage

Run the script:

```bash
npm run check:non-owais
```

## Output

The script will:

- Fetch all documents from your naatcollections
- Filter for "Baghdadi Sound and Media" channel
- Count how many don't contain Owais Raza/Qadri in the title
- Display a summary in the console
- Save a detailed report to `non-owais-naats-report.json`

## Report Contents

The JSON report includes:

- Summary statistics (total, counts, percentage)
- Full list of non-Owais naats with:
  - Document ID
  - Title
  - Channel name
  - YouTube ID
  - Upload date
