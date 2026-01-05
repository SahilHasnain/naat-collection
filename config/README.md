# Configuration Setup

This directory contains configuration files for the Naat Platform application.

## Environment Variables

The application requires the following environment variables to be set in `.env.local`:

### Required Variables

- `EXPO_PUBLIC_APPWRITE_ENDPOINT` - Your Appwrite server endpoint (e.g., https://cloud.appwrite.io/v1)
- `EXPO_PUBLIC_APPWRITE_PROJECT_ID` - Your Appwrite project ID
- `EXPO_PUBLIC_APPWRITE_DATABASE_ID` - Your Appwrite database ID
- `EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID` - Your Naats collection ID

### Setup Instructions

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Appwrite credentials in `.env.local`

3. The application will validate these variables on startup

### Note on EXPO*PUBLIC* Prefix

Environment variables in Expo must be prefixed with `EXPO_PUBLIC_` to be accessible in the React Native application. Variables without this prefix are only available in Node.js environments (like build scripts).

## Appwrite Configuration

The `appwrite.ts` file exports:

- `appwriteConfig` - Object containing all Appwrite configuration values
- `validateAppwriteConfig()` - Function to validate that all required config is present

Import and use in your services:

```typescript
import { appwriteConfig, validateAppwriteConfig } from "@/config/appwrite";

// Validate config before using
validateAppwriteConfig();

// Use config values
const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);
```
