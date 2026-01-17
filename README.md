# Naat Collection - Monorepo

A cross-platform application for browsing and listening to Islamic naats (devotional songs), built with React Native and Next.js.

## Project Structure

```
naat-collection/
├── apps/
│   ├── mobile/          # React Native/Expo mobile app
│   └── web/             # Next.js web app (coming soon)
├── packages/
│   ├── shared/          # Shared utilities and types (coming soon)
│   └── api-client/      # Appwrite API client (coming soon)
└── docs/                # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
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

# Run web version
npm run mobile:web
```

#### Web App (Coming Soon)

```bash
npm run web
```

## Development

This is a monorepo managed with npm workspaces. Each app and package can be developed independently while sharing common code.

### Available Scripts

- `npm run mobile` - Start mobile development server
- `npm run mobile:android` - Run on Android device/emulator
- `npm run mobile:ios` - Run on iOS simulator
- `npm run mobile:lint` - Lint mobile app
- `npm run mobile:test` - Run mobile tests
- `npm run setup:appwrite` - Set up Appwrite backend
- `npm run ingest:videos` - Ingest video data

## Documentation

- [Monorepo Migration Plan](./docs/MONOREPO_MIGRATION_PLAN.md)
- [Progressive Loading Strategy](./docs/FOR_YOU_PROGRESSIVE_LOADING.md)

## Tech Stack

### Mobile

- React Native
- Expo
- NativeWind (Tailwind CSS)
- Appwrite (Backend)
- TypeScript

### Web (Coming Soon)

- Next.js 15
- React 19
- Tailwind CSS
- Appwrite (Backend)
- TypeScript

## Contributing

See individual app READMEs for specific development guidelines:

- [Mobile App](./apps/mobile/README.md)

## License

Private project
