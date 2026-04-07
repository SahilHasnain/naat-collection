# Naat Collection - Web Admin

Standalone Next.js web application for managing the Naat Collection.

## Features

- Exclude/include naats from the mobile app
- Manual audio cutting with preview
- Admin panel with password protection

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with required environment variables (see `.env.example`)

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Deployment

This app is designed to be deployed to Appwrite Static Sites.

Use the build script from the project root:
```bash
bash build-for-appwrite.sh
```

## Environment Variables

Required variables:
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- `NEXT_PUBLIC_APPWRITE_DATABASE_ID`
- `NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID`
- `NEXT_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID`
- `NEXT_PUBLIC_ADMIN_PASSWORD` (client-visible admin gate password, max 10 chars)
- `APPWRITE_API_KEY` (server-side only)

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Appwrite SDK
- FFmpeg for audio processing
