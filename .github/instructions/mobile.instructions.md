---
description: "Use when: writing React Native components, Expo Router screens, NativeWind styles, mobile hooks, contexts, or services in the naat-collection mobile app."
applyTo: "apps/mobile/**"
---

# Mobile App Conventions

## Expo Router

- File-based routing in `app/` — each `.tsx` file is a screen
- Root layout at `app/_layout.tsx` wraps all screens with 8 context providers
- Use `expo-router` navigation (`useRouter`, `Link`, `Tabs`)

## NativeWind Styling

- Use `className` prop with Tailwind classes — no inline `style` objects unless animating
- Custom theme tokens defined in `tailwind.config.js`: `primary`, `neutral` color scales
- Use `dark:` prefix for dark mode variants

## State Management

- React Context API for global state — one context per domain
- Pattern: `contexts/XContext.tsx` exports `XProvider` + `useX()` hook
- New global state → create context, add provider to `_layout.tsx`
- Local state → `useState`/`useReducer` inside component

## Hooks

- Custom hooks in `hooks/` — return `{ data, loading, error, refetch }` pattern
- Prefix with `use` — e.g., `useNaats()`, `useChannels()`
- Call `AppwriteService` methods from hooks, never from components directly

## Services

- Business logic in `services/` — plain modules with exported functions
- `appwrite.ts` wraps `AppwriteService` with Sentry error tracking
- `trackPlayerService.ts` handles audio playback lifecycle
- `storage.ts` wraps AsyncStorage — use it instead of calling AsyncStorage directly

## Components

- Functional components with TypeScript interfaces for props
- No default exports — use named exports
- Group by domain: player components, card components, filter/modal components
- Skeleton loaders for async content (`SkeletonLoader` component)

## API Layer

- Always use `AppwriteService` from `packages/api-client/` (via `services/appwrite.ts`)
- Never import `appwrite` SDK directly in mobile app code
- Config via `createAppwriteConfig()` from `packages/shared/`

## Types

- Shared types (`Naat`, `Channel`, etc.) from `@naat-collection/shared`
- Mobile-specific types in `types/` (e.g., `live-radio.ts`)

## Error Handling

- Wrap service calls with try/catch in hooks
- Use `ErrorBoundary` component for UI error recovery
- Report errors to Sentry via `services/appwrite.ts` wrapper

## Imports

- Relative imports only (no path aliases like `@/`)
- Group: React/RN → expo → third-party → local services/hooks/components → types
