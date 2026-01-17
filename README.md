# Naat Collection - Monorepo

A cross-platform application for browsing and listening to Islamic naats (devotional songs), built with React Native and Next.js.

## Project Structure

```
naat-collection/
├── apps/
│   ├── mobile/          # React Native/Expo mobile app
│   └── web/             # Next.js 16 web app
├── packages/
│   ├── shared/          # Shared types, config, utilities
│   └── api-client/      # Platform-agnostic Appwrite service
└── docs/                # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- For mobile: Expo CLI, Android Studio or Xcode

### Installation

```bash
# Install all dependencies
npm install
```

### Running the Apps

#### Mobile App

```bash
# Start Expo dev server
npm run mobile

# Run on Android
npm run mobile:android

# Run on iOS
npm run mobile:ios
```

#### Web App

```bash
# Start Next.js dev server
npm run web

# Build for production
npm run web:build

# Start production server
npm run web:start
```

## Development

This is a monorepo managed with npm workspaces. Each app and package can be developed independently while sharing common code.

### Available Scripts

**Mobile:**

- `npm run mobile` - Start mobile development server
- `npm run mobile:android` - Run on Android device/emulator
- `npm run mobile:ios` - Run on iOS simulator
- `npm run mobile:lint` - Lint mobile app
- `npm run mobile:test` - Run mobile tests

**Web:**

- `npm run web` - Start web development server
- `npm run web:build` - Build for production
- `npm run web:start` - Start production server
- `npm run web:lint` - Lint web app

**Other:**

- `npm run setup:appwrite` - Set up Appwrite backend
- `npm run ingest:videos` - Ingest video data

## Documentation

- [Monorepo Migration Plan](./docs/MONOREPO_MIGRATION_PLAN.md)
- [Monorepo Complete Summary](./docs/MONOREPO_COMPLETE.md)
- [Progressive Loading Strategy](./docs/FOR_YOU_PROGRESSIVE_LOADING.md)
- [Phase 2 Summary](./docs/PHASE_2_SUMMARY.md)
- [Phase 3 Summary](./docs/PHASE_3_SUMMARY.md)

## Tech Stack

### Mobile

- React Native 0.81
- Expo 54
- NativeWind (Tailwind CSS)
- Appwrite (Backend)
- TypeScript

### Web

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Appwrite (Backend)
- TypeScript

### Shared

- TypeScript
- Appwrite SDK
- Shared types and utilities

## Features

### Mobile App

- Browse naats by artist
- Audio playback with controls
- Search functionality
- Favorites/bookmarks
- Offline support
- Background audio playback

### Web App

- Browse naats with server-side rendering
- Individual naat detail pages
- Channel/artist pages
- Responsive design
- YouTube video embed
- Fast performance

## Contributing

See individual app READMEs for specific development guidelines:

- [Mobile App](./apps/mobile/README.md)
- [Web App](./apps/web/README.md)

## License

Private project
