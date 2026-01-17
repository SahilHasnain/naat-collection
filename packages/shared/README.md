# @naat-collection/shared

Shared types, utilities, and configuration for the Naat Collection monorepo.

## What's included

- **Types**: TypeScript interfaces and types for Naats, Channels, API responses, etc.
- **Config**: Platform-agnostic Appwrite configuration
- **Utils**: Common utility functions for formatting, date handling, etc.

## Usage

```typescript
import {
  Naat,
  Channel,
  formatViews,
  formatRelativeTime,
  createAppwriteConfig,
} from "@naat-collection/shared";
```

## Development

```bash
# Type check
npm run type-check
```
