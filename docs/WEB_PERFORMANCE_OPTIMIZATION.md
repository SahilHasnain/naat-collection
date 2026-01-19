# Web Performance Optimization

## Problem

The web app was fetching all 10,000+ videos at once when using the "For You" filter, causing:

- Slow initial page load (5-10+ seconds)
- Poor user experience
- High memory usage
- Blocked UI during fetch

## Solution

Implemented the same smart progressive loading strategy from mobile:

### Progressive Loading Strategy

1. **Initial Fast Load**: Fetch 1000 videos first (~1-2 seconds)
2. **Apply Algorithm**: Run For You algorithm on initial batch
3. **Show Results**: Display first 20 videos immediately
4. **Background Fetch**: Continue fetching remaining videos in 500-video batches
5. **Update Recommendations**: Re-apply algorithm as more data arrives

### Infinite Scroll

- Shows 20 videos at a time
- Automatically loads more as user scrolls
- Uses IntersectionObserver for efficient detection
- Caches results to avoid redundant API calls

### Caching Strategy

- In-memory cache per channel + filter combination
- Caches both pages and full ordered lists
- Survives filter changes without re-fetching
- Cleared only on explicit refresh

## Performance Improvements

### Before

- Initial load: 5-10+ seconds (fetching 10,000 videos)
- Memory: High (all videos in memory)
- UX: Blocked UI, no feedback

### After

- Initial load: 1-2 seconds (fetching 1000 videos)
- Memory: Low (paginated loading)
- UX: Instant feedback, smooth scrolling
- Background: Continues fetching without blocking

## Implementation Details

### New Hook: `useNaats`

Located at `apps/web/hooks/useNaats.ts`

Features:

- Progressive loading for "For You" filter
- Standard pagination for other filters
- In-memory caching
- Infinite scroll support
- Error handling
- Filter/channel change detection

### Updated Page: `apps/web/app/page.tsx`

- Uses `useNaats` hook for browse mode
- Separate search handling (no pagination needed)
- IntersectionObserver for infinite scroll
- Loading states for initial and pagination loads

## Usage

```typescript
const {
  naats, // Current loaded naats
  loading, // Loading state
  error, // Error state
  hasMore, // More naats available
  loadMore, // Load next page
  refresh, // Clear cache and reload
} = useNaats(channelId, sortOption);
```

## Testing

1. Open web app
2. Select "For You" filter
3. Observe fast initial load (~1-2 seconds)
4. Scroll down to trigger infinite scroll
5. Check console for background fetch logs
6. Switch filters to test caching

## Future Improvements

- Add pull-to-refresh gesture
- Implement service worker for offline caching
- Add loading skeleton for better perceived performance
- Consider virtual scrolling for very long lists
