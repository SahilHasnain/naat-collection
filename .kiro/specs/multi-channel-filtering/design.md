# Design Document

## Overview

This design implements dynamic multi-channel filtering for the Naat application. The solution extends the existing filter architecture to support channel-based filtering alongside sort-based filtering, using a two-row UI layout. The system automatically discovers available channels from the database and maintains separate caches for each filter combination.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Home Screen                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Search Bar                                           │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Channel Filter Row: [All] [Channel A] [Channel B]   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Sort Filter Row: [Latest] [Popular] [Oldest]        │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │              Naat Cards (FlatList)                   │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Data Flow:
User Selection → useNaats Hook → Appwrite Service → Database
                      ↓
                  Cache Layer
                      ↓
                 UI Rendering
```

### Component Hierarchy

```
HomeScreen
├── SearchBar
├── ChannelFilterBar (new)
├── SortFilterBar (refactored from FilterBar)
├── FlatList
│   └── NaatCard
├── BackToTopButton
└── VideoModal
```

## Components and Interfaces

### 1. ChannelFilterBar Component (New)

**Purpose:** Renders a horizontal scrollable list of channel filter buttons

**Props:**

```typescript
interface ChannelFilterBarProps {
  channels: Channel[];
  selectedChannelId: string | null; // null represents "All"
  onChannelChange: (channelId: string | null) => void;
  loading?: boolean;
}

interface Channel {
  id: string;
  name: string;
}
```

**Behavior:**

- Displays "All" as the first option (channelId = null)
- Renders discovered channels in alphabetical order
- Highlights the selected channel with distinct styling
- Shows loading skeleton while channels are being fetched
- Horizontally scrollable with no scroll indicator

**Styling:**

- Similar to existing FilterBar component
- Uses emoji icon "🌐" for "All" option
- Uses emoji icon "📺" for individual channels
- Blue background for selected, neutral background for unselected

### 2. SortFilterBar Component (Refactored)

**Purpose:** Renders sort options (Latest, Popular, Oldest)

**Props:**

```typescript
interface SortFilterBarProps {
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

type SortOption = "latest" | "popular" | "oldest";
```

**Changes from Current FilterBar:**

- Rename `FilterBar` to `SortFilterBar`
- Rename `FilterOption` to `SortOption`
- Remove channel-related logic (now in ChannelFilterBar)
- Keep existing styling and behavior

### 3. useNaats Hook (Enhanced)

**Purpose:** Manages naat data fetching with channel and sort filtering

**Signature:**

```typescript
function useNaats(channelId: string | null, sortBy: SortOption): UseNaatsReturn;
```

**Changes:**

- Add `channelId` parameter (null = all channels)
- Update cache key to include both channelId and sortBy: `${channelId || 'all'}_${sortBy}`
- Reset state when either channelId or sortBy changes
- Pass channelId to appwriteService.getNaats()

**Cache Structure:**

```typescript
// Before: Map<sortBy, Map<offset, Naat[]>>
// After:  Map<cacheKey, Map<offset, Naat[]>>
// where cacheKey = `${channelId || 'all'}_${sortBy}`
```

### 4. useChannels Hook (New)

**Purpose:** Fetches and manages available channels from the database

**Signature:**

```typescript
interface UseChannelsReturn {
  channels: Channel[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

function useChannels(): UseChannelsReturn;
```

**Implementation:**

- Fetches distinct channels on mount
- Caches results in memory
- Provides refresh function for pull-to-refresh
- Sorts channels alphabetically by name

### 5. AppwriteService (Enhanced)

**New Method:**

```typescript
async getChannels(): Promise<Channel[]>
```

**Implementation Strategy:**

- Query all documents with `Query.select(['channelId', 'channelName'])`
- Use a Set to deduplicate channels
- Sort alphabetically by channelName
- Cache results with key `channels_list`

**Enhanced Method:**

```typescript
async getNaats(
  limit: number,
  offset: number,
  sortBy: "latest" | "popular" | "oldest",
  channelId?: string | null
): Promise<Naat[]>
```

**Changes:**

- Add optional `channelId` parameter
- When channelId is provided, add `Query.equal('channelId', channelId)` to queries
- Update cache key to include channelId
- Maintain backward compatibility (channelId defaults to null)

**Enhanced Method:**

```typescript
async searchNaats(
  query: string,
  channelId?: string | null
): Promise<Naat[]>
```

**Changes:**

- Add optional `channelId` parameter
- When channelId is provided, add `Query.equal('channelId', channelId)` to queries
- Update cache key to include channelId

### 6. Ingestion Script (Enhanced)

**Current Structure:**

```javascript
// Single channel from env variable
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
```

**New Structure:**

```javascript
// Multiple channels from env variable (comma-separated)
const YOUTUBE_CHANNEL_IDS =
  process.env.YOUTUBE_CHANNEL_IDS || process.env.YOUTUBE_CHANNEL_ID;
const channelIds = YOUTUBE_CHANNEL_IDS.split(",").map((id) => id.trim());
```

**Changes:**

- Accept comma-separated channel IDs in `YOUTUBE_CHANNEL_IDS` env variable
- Fall back to `YOUTUBE_CHANNEL_ID` for backward compatibility
- Process each channel sequentially
- Store correct channelId and channelName for each video
- Report statistics per channel and overall
- Maintain existing deduplication logic using youtubeId

**Example .env:**

```
YOUTUBE_CHANNEL_IDS=UCxxxxx,UCyyyyy,UCzzzzz
```

## Data Models

### Channel Interface (New)

```typescript
export interface Channel {
  id: string; // YouTube channel ID
  name: string; // Channel display name
}
```

### Naat Interface (No Changes)

The existing Naat interface already contains the necessary fields:

```typescript
export interface Naat {
  channelId: string;
  channelName: string;
  // ... other fields
}
```

## Error Handling

### Channel Discovery Errors

**Scenario:** getChannels() fails
**Handling:**

- Log error with context
- Return empty array as fallback
- Show "All" option only
- Display error toast (optional)

### Filter State Errors

**Scenario:** Invalid channelId selected
**Handling:**

- Reset to "All" channels
- Log warning
- Continue with normal operation

### Cache Invalidation

**Scenario:** User performs pull-to-refresh
**Handling:**

- Clear all filter caches (both channel and sort combinations)
- Refetch channels list
- Reload current filter combination

## Testing Strategy

### Unit Tests

1. **useChannels Hook**
   - Fetches channels on mount
   - Handles empty channel list
   - Handles API errors gracefully
   - Sorts channels alphabetically

2. **useNaats Hook with Channel Filter**
   - Resets state when channelId changes
   - Maintains separate caches per channel
   - Passes correct channelId to service

3. **AppwriteService.getChannels()**
   - Returns deduplicated channels
   - Sorts alphabetically
   - Handles empty database

4. **AppwriteService.getNaats() with channelId**
   - Adds channel filter query when channelId provided
   - Omits channel filter when channelId is null
   - Maintains backward compatibility

### Integration Tests

1. **Channel + Sort Filter Combination**
   - Selecting channel A + Popular shows correct results
   - Switching from channel A to channel B updates data
   - Switching from Latest to Popular maintains channel selection

2. **Search with Channel Filter**
   - Search respects active channel filter
   - Search works across all channels when "All" selected

3. **Pull-to-Refresh**
   - Clears all caches
   - Refetches channels
   - Maintains filter selections

### Component Tests

1. **ChannelFilterBar**
   - Renders "All" option first
   - Renders channels in alphabetical order
   - Highlights selected channel
   - Calls onChannelChange with correct channelId

2. **HomeScreen Integration**
   - Both filter rows render correctly
   - Filter selections persist during navigation
   - Filters reset on app restart

## Performance Considerations

### Cache Strategy

**Multi-dimensional Caching:**

```typescript
// Cache key format: `${channelId || 'all'}_${sortBy}_${offset}`
// Example keys:
// - "all_latest_0"
// - "all_popular_0"
// - "UCxxxxx_latest_0"
// - "UCxxxxx_popular_20"
```

**Memory Management:**

- Limit cache size to 50 entries per filter combination
- Clear oldest entries when limit exceeded
- Clear all caches on pull-to-refresh

### Query Optimization

**Channel Discovery:**

- Use `Query.select()` to fetch only channelId and channelName
- Cache results for 5 minutes
- Refresh on pull-to-refresh

**Filtered Queries:**

- Add channel filter as first query for optimal indexing
- Maintain existing pagination strategy
- Use existing sort query patterns

### UI Performance

**ChannelFilterBar:**

- Use FlatList for horizontal scrolling if >5 channels
- Implement shouldComponentUpdate for filter buttons
- Lazy load channel icons if using images

**State Updates:**

- Debounce filter changes (100ms) to prevent rapid re-renders
- Use React.memo for filter button components
- Maintain existing FlatList optimizations

## Migration Path

### Phase 1: Backend Changes

1. Add getChannels() method to AppwriteService
2. Enhance getNaats() to accept channelId parameter
3. Enhance searchNaats() to accept channelId parameter
4. Update ingestion script for multiple channels

### Phase 2: Hook Updates

1. Create useChannels hook
2. Update useNaats hook to accept channelId
3. Update useSearch hook to accept channelId

### Phase 3: UI Changes

1. Rename FilterBar to SortFilterBar
2. Create ChannelFilterBar component
3. Update HomeScreen to use both filter bars
4. Update type definitions

### Phase 4: Testing & Polish

1. Add unit tests
2. Add integration tests
3. Test with multiple channels
4. Performance testing with large datasets

## Design Decisions and Rationales

### Decision 1: Single Collection vs Multiple Collections

**Chosen:** Single collection with channelId field

**Rationale:**

- Simpler schema management
- Unified search across channels
- Easier to add new channels
- Existing structure already supports this
- No data migration needed

### Decision 2: Dynamic vs Static Channel List

**Chosen:** Dynamic channel discovery from database

**Rationale:**

- No hardcoding of channel information
- Automatically adapts to new channels
- Simpler configuration management
- Aligns with user's requirement for flexibility

### Decision 3: Two-Row vs Single-Row Filter Layout

**Chosen:** Two-row layout (channels on top, sort below)

**Rationale:**

- Clear visual separation of filter types
- Prevents overcrowding on small screens
- Aligns with user's preference
- Easier to understand for users

### Decision 4: Cache Key Structure

**Chosen:** Composite key `${channelId || 'all'}_${sortBy}`

**Rationale:**

- Maintains separate caches per filter combination
- Prevents cache collisions
- Enables fast filter switching
- Supports existing cache infrastructure

### Decision 5: Ingestion Script Enhancement

**Chosen:** Comma-separated channel IDs in single env variable

**Rationale:**

- Simple configuration
- Backward compatible with existing setup
- Easy to add/remove channels
- No complex configuration files needed
