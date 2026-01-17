# Naat Collection - Mobile App

React Native/Expo mobile application for browsing and listening to Islamic naats.

## Development

### Prerequisites

- Node.js 18+
- Expo CLI
- Android Studio (for Android) or Xcode (for iOS)

### Setup

```bash
# From the root of the monorepo
npm install

# Start the development server
npm run mobile
```

### Environment Variables

Create `.env` and `.env.appwrite` files in this directory with the following:

```env
# .env
EXPO_PUBLIC_APPWRITE_ENDPOINT=your_endpoint
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_project_id

# .env.appwrite
APPWRITE_API_KEY=your_api_key
```

### Running

```bash
# Development server
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## Project Structure

```
mobile/
├── app/              # Expo Router pages
├── components/       # React components
├── config/           # Configuration files
├── constants/        # App constants
├── contexts/         # React contexts
├── hooks/            # Custom hooks
├── services/         # API services
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## Features

- Browse naats by artist
- Audio playback with controls
- Search functionality
- Favorites/bookmarks
- Offline support
- Background audio playback

## Tech Stack

- React Native 0.81
- Expo 54
- TypeScript
- NativeWind (Tailwind CSS)
- Appwrite (Backend)
- Expo Router (Navigation)
