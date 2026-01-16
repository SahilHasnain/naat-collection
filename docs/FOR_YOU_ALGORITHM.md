# For You Algorithm

## Overview

The "For You" feed provides personalized, smart content discovery using a weighted randomization algorithm. Unlike simple random shuffle, it intelligently balances multiple factors to show users fresh, relevant content every time they visit.

**Uses progressive loading: Fast initial results (1000 videos in ~1 second) + background enhancement to eventually process all 3000+ videos!**

## How It Works

### Algorithm Factors

The algorithm scores each naat based on 5 weighted factors:

1. **Recency (25%)** - Newer content gets higher priority
   - Uses exponential decay: content loses 50% score every 30 days
   - Ensures users see fresh uploads

2. **Engagement (30%)** - Popular content is prioritized
   - Based on view count
   - Normalized across the dataset

3. **Diversity (20%)** - Mixes different channels
   - Penalizes channels that appear too frequently
   - Ensures variety in recommendations

4. **Unseen (15%)** - Prioritizes unwatched content
   - Tracks watch history (last 100 naats)
   - Gives bonus score to content user hasn't seen

5. **Random Factor (10%)** - Adds unpredictability
   - Ensures discovery of unexpected content
   - Keeps the feed interesting

### Session Caching

- Feed order is cached for 1 hour per session
- Users see consistent order when scrolling during a visit
- Cache expires after 1 hour or on pull-to-refresh
- Prevents jarring reordering mid-session

### Watch History Tracking

- Automatically tracks when users play a naat
- Stores last 100 watched naats
- Used to avoid showing recently watched content
- Non-intrusive (doesn't throw errors if tracking fails)

## User Experience

### First Visit

1. User opens app → sees "For You" feed (default)
2. Algorithm generates personalized order
3. Mix of new, popular, and diverse content
4. Unwatched content prioritized

### During Session

- Scroll position maintained
- Same order throughout session
- Smooth infinite scroll
- No sudden reordering

### Next Visit (after 1 hour)

- Fresh algorithm run
- New randomized order
- Updated based on latest watch history
- Different content mix

### Pull to Refresh

- Clears session cache
- Regenerates feed order
- Shows latest content
- Reapplies algorithm

## Technical Implementation

### Files Modified

1. **services/storage.ts**
   - Added `addToWatchHistory()` - Track watched naats
   - Added `getWatchHistory()` - Retrieve watch history
   - Added `saveForYouSession()` - Cache session order
   - Added `getForYouSession()` - Retrieve cached order
   - Added `clearForYouSession()` - Clear cache

2. **services/forYouAlgorithm.ts** (NEW)
   - `calculateRecencyScore()` - Score based on upload date
   - `calculateEngagementScore()` - Score based on views
   - `calculateDiversityScore()` - Score based on channel variety
   - `weightedShuffle()` - Apply weighted randomization
   - `generateForYouFeed()` - Main algorithm
   - `getForYouFeed()` - With session caching

3. **hooks/useNaats.ts**
   - Updated to support "forYou" filter
   - Fetches larger batch (100 items) for better algorithm results
   - Applies algorithm before pagination
   - Clears session cache on refresh

4. **components/SortFilterBar.tsx**
   - Added "For You" option with ✨ icon
   - Positioned as first/default option

5. **app/index.tsx**
   - Changed default filter to "forYou"
   - Added watch history tracking on naat play
   - Tracks both audio and video playback

6. **types/index.ts**
   - Updated `SortOption` type to include "forYou"

## Performance Considerations

### Batch Fetching

- Uses progressive loading strategy for optimal performance
- Initial batch: 1000 videos (~1 second load time)
- Background fetch: Remaining 2000+ videos (non-blocking)
- Handles large datasets (3000+ videos) efficiently
- Still paginated for smooth scrolling (20 per page)
- Dynamically handles new uploads

### Caching Strategy

- Session cache prevents redundant calculations
- In-memory cache for pagination
- Minimal storage footprint

### Non-Blocking Operations

- Watch history tracking doesn't block playback
- Errors in tracking are logged but don't affect UX
- Algorithm runs asynchronously

## Future Enhancements

Potential improvements:

1. **User Preferences**
   - Allow users to adjust algorithm weights
   - "More like this" feature
   - Channel preferences

2. **Advanced Tracking**
   - Track completion rate (did they finish?)
   - Track skip behavior
   - Time of day preferences

3. **Collaborative Filtering**
   - "Users who watched X also watched Y"
   - Trending within user's interests

4. **A/B Testing**
   - Test different weight combinations
   - Measure engagement metrics
   - Optimize algorithm over time

## Testing

To test the algorithm:

1. **Fresh Install**

   ```bash
   # Clear app data and reinstall
   npm run android
   ```

   - Should see "For You" as default
   - Content should be mixed (not just latest)

2. **Watch History**
   - Play several naats
   - Pull to refresh
   - Previously watched should appear less frequently

3. **Session Persistence**
   - Scroll through feed
   - Close and reopen app within 1 hour
   - Should see same order

4. **Cache Expiry**
   - Wait 1 hour or pull to refresh
   - Should see new order
   - Different content mix

## Monitoring

Key metrics to track:

- **Engagement Rate**: Do users watch more with "For You"?
- **Session Duration**: Do users stay longer?
- **Content Discovery**: Are users finding diverse content?
- **Return Rate**: Do users come back more often?

## Troubleshooting

### Feed not changing

- Check if session cache is working
- Verify 1-hour expiry
- Try pull-to-refresh

### Same content repeatedly

- Check watch history tracking
- Verify algorithm weights
- Ensure sufficient content in database

### Performance issues

- Monitor batch fetch size
- Check algorithm execution time
- Review caching strategy
