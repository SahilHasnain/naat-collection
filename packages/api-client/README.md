# @naat-collection/api-client

Platform-agnostic Appwrite API client for the Naat Collection.

## What's included

- **AppwriteService**: Service class for interacting with Appwrite backend
  - Fetch naats (with pagination, sorting, filtering)
  - Search naats
  - Get channels
  - Get audio URLs

## Usage

```typescript
import { AppwriteService } from "@naat-collection/api-client";
import { createAppwriteConfig } from "@naat-collection/shared";

const config = createAppwriteConfig(process.env);
const service = new AppwriteService({
  config,
  onError: (error, context) => {
    console.error("Appwrite error:", error, context);
  },
});

// Fetch naats
const naats = await service.getNaats(20, 0, "latest");

// Search
const results = await service.searchNaats("owais raza");

// Get channels
const channels = await service.getChannels();
```

## Development

```bash
# Type check
npm run type-check
```
