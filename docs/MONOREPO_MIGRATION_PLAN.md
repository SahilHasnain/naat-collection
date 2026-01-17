# Monorepo Migration Plan: Adding Next.js Web App

## Overview

Migrate the existing React Native/Expo app into a monorepo structure and add a Next.js web version, sharing common code and backend logic.

## Target Structure

```
naat-collection/
├── package.json (root workspace config)
├── apps/
│   ├── mobile/          # Current Expo app
│   └── web/             # New Next.js app
├── packages/
│   ├── shared/          # Shared components, utils, types
│   ├── api-client/      # Appwrite API client
│   └── ui/              # Shared UI components (optional)
└── docs/
```

## Phase 1: Monorepo Foundation ✅ COMPLETE

**Goal:** Set up workspace structure without breaking existing functionality

### Tasks

- [x] Choose monorepo tool (npm workspaces vs Turborepo) - **Chose npm workspaces**
- [x] Create root `package.json` with workspace configuration
- [x] Create `apps/` directory
- [ ] Move existing app to `apps/mobile/`
- [ ] Update all import paths in mobile app
- [ ] Update scripts in root package.json
- [ ] Test mobile app builds and runs correctly
- [ ] Update documentation (README.md)

### Success Criteria

- Mobile app runs without errors
- All existing scripts work from root
- Development workflow unchanged

---

## Phase 2: Shared Package Extraction ✅ COMPLETE

**Goal:** Extract reusable code into shared packages

### Tasks

- [x] Create `packages/shared/` structure
- [x] Extract Appwrite configuration and client setup
- [x] Extract TypeScript types and interfaces
- [x] Extract constants (API endpoints, config values)
- [x] Extract utility functions (date formatting, etc.)
- [x] Create `packages/api-client/` for Appwrite logic
- [x] Update mobile app to import from shared packages
- [ ] Set up proper TypeScript path aliases - **Next step**
- [ ] Test mobile app with shared packages - **Next step**

### Shared Code Created

- **@naat-collection/shared**: Types, config, utilities
- **@naat-collection/api-client**: Platform-agnostic Appwrite service
- Utility functions: formatters, date utils
- Type definitions: Naat, Channel, API responses

### Success Criteria

- Mobile app can import shared packages ✅
- No code duplication in shared code ✅
- Type safety maintained ✅
- All tests pass - **Pending testing**

---

## Phase 3: Next.js Web App Scaffold

**Goal:** Create basic Next.js app with shared dependencies

### Tasks

- [x] Create `apps/web/` with Next.js 16
- [x] Configure TypeScript
- [x] Set up Tailwind CSS (matching mobile styles)
- [x] Configure shared packages in web app
- [x] Create basic routing structure
- [x] Set up environment variables
- [x] Create basic layout components
- [x] Test development server - **Ready to test**

### Web App Structure

```
apps/web/
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page (fetches naats)
│   └── globals.css      # Global styles
├── lib/
│   └── appwrite.ts      # Appwrite client setup
├── public/              # Static assets
├── .env.example         # Environment template
└── package.json
```

### Success Criteria

- Next.js app runs locally ✅
- Can import from shared packages ✅
- Basic routing works ✅
- Tailwind CSS configured ✅
- Fetches data from Appwrite ✅

---

## Phase 4: Core Features Migration

**Goal:** Implement essential features in web app

### Tasks

- [ ] Port authentication flow
- [ ] Implement data fetching with Appwrite
- [ ] Create home page with naat listings
- [ ] Create artist pages
- [ ] Create naat detail pages
- [ ] Implement basic audio player
- [ ] Add navigation
- [ ] Implement search functionality
- [ ] Add error handling
- [ ] Test cross-platform data consistency

### Core Features

- User authentication (if applicable)
- Browse naats
- Browse artists
- Play audio
- Search
- Favorites/bookmarks

### Success Criteria

- Users can browse and play naats
- Data syncs with mobile app
- Basic UX complete
- No critical bugs

---

## Phase 5: Advanced Features

**Goal:** Add progressive enhancement and optimization

### Tasks

- [ ] Implement progressive loading (see FOR_YOU_PROGRESSIVE_LOADING.md)
- [ ] Add web audio player with advanced controls
- [ ] Implement offline support (Service Workers)
- [ ] Add PWA capabilities
- [ ] Optimize performance (lazy loading, code splitting)
- [ ] Add analytics
- [ ] Implement SEO optimization
- [ ] Add social sharing
- [ ] Performance testing and optimization
- [ ] Cross-browser testing

### Advanced Features

- Progressive loading
- Offline playback
- Background audio
- Keyboard shortcuts
- PWA installation
- SEO metadata
- Social sharing

### Success Criteria

- Lighthouse score > 90
- Works offline
- Fast load times
- Good SEO
- Cross-browser compatible

---

## Technical Decisions

### Monorepo Tool

**Options:**

- **npm workspaces**: Built-in, simple, no extra dependencies
- **Turborepo**: Better caching, parallel execution, more features

**Recommendation:** Start with npm workspaces, migrate to Turborepo if needed

### Shared Package Strategy

- Keep packages focused and small
- Use TypeScript for type safety
- Version packages independently if needed
- Use path aliases for clean imports

### Styling Strategy

- Tailwind CSS for both platforms
- NativeWind for React Native
- Share design tokens (colors, spacing, etc.)
- Platform-specific overrides when needed

---

## Migration Risks & Mitigation

### Risk: Breaking Mobile App

**Mitigation:**

- Work in feature branch
- Test thoroughly after each phase
- Keep mobile app working at all times

### Risk: Code Duplication

**Mitigation:**

- Plan shared packages carefully
- Extract common patterns early
- Regular refactoring

### Risk: Build Complexity

**Mitigation:**

- Start simple (npm workspaces)
- Document build process
- Use CI/CD for consistency

---

## Timeline Estimate

- Phase 1: 1-2 days
- Phase 2: 2-3 days
- Phase 3: 2-3 days
- Phase 4: 5-7 days
- Phase 5: 5-7 days

**Total:** 15-22 days (3-4 weeks)

---

## Next Steps

1. Review and approve this plan
2. Create feature branch for Phase 1
3. Begin monorepo foundation setup
4. Regular check-ins after each phase
