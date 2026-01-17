# Naat Collection - Web App

Next.js 16 web application for browsing and listening to Islamic naats.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Update `.env.local` with your Appwrite credentials

3. Install dependencies (from monorepo root):

```bash
npm install
```

4. Run the development server:

```bash
# From root
npm run web

# Or from this directory
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
web/
├── app/              # Next.js App Router pages
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   └── globals.css   # Global styles
├── lib/              # Utilities and configurations
│   └── appwrite.ts   # Appwrite client setup
└── public/           # Static assets
```

## Features

- Browse naats by latest, popular, or oldest
- Search functionality
- Filter by channel/artist
- Audio playback
- Responsive design
- Server-side rendering

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Appwrite (via @naat-collection/api-client)
- **Shared Code**: @naat-collection/shared

## Shared Packages

This app uses shared packages from the monorepo:

- `@naat-collection/shared` - Types, utilities, config
- `@naat-collection/api-client` - Appwrite service

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

## Environment Variables

All environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

See `.env.example` for required variables.

## Deployment

This app can be deployed to:

- Vercel (recommended)
- Netlify
- Any Node.js hosting platform

Make sure to set environment variables in your deployment platform.
