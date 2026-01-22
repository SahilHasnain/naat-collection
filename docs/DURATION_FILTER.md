# Duration Filter Feature

## Overview

The duration filter allows users to filter naats by their length, making it easier to find content that fits their available time.

## Filter Options

| Option   | Label    | Duration Range       | Icon |
| -------- | -------- | -------------------- | ---- |
| `all`    | All      | No filter            | ⏱️   |
| `short`  | < 5 min  | Less than 5 minutes  | ⚡   |
| `medium` | 5-15 min | 5 to 15 minutes      | ⏳   |
| `long`   | > 15 min | More than 15 minutes | 📺   |

## Implementation

### Components Created

#### Mobile

- **`apps/mobile/components/UnifiedFilterBar.tsx`** ⭐ **NEW SMART APPROACH**
  - Unified filter combining Sort, Channel, and Duration in one compact bar
  - Three filter buttons displayed horizontally
  - Tap any button to open modal with tabbed interface
  - Active filters highlighted in blue
  - "Clear" button to reset channel and duration filters
  - Reduces clutter from 3 separate bars to 1 clean interface
  - Modal with tabs: Sort | Channel | Duration

- **`apps/mobile/components/DurationFilterBar.tsx`** (legacy standalone)
  - Original horizontal scrollable filter bar
  - Kept for reference or alternative implementations

#### Web

- **`apps/web/components/DurationFilter.tsx`**
  - Responsive component with two modes:
    - Mobile: Horizontal scrollable pills
    - Desktop: Dropdown select
  - Matches existing filter component patterns

### Shared Utilities

#### Type Definition

- **`packages/shared/src/types.ts`**
  - Added `DurationOption` type: `"all" | "short" | "medium" | "long"`

#### Filter Function

- **`packages/shared/src/utils/durationFilter.ts`**
  - `filterNaatsByDuration(naats: Naat[], duration: DurationOption): Naat[]`
  - Client-side filtering based on naat duration in seconds
  - Exported from `packages/shared/src/index.ts`

### Integration

#### Mobile App (`apps/mobile/app/index.tsx`)

1. Added duration state: `useState<DurationOption>("all")`
2. Imported `UnifiedFilterBar` component
3. **Replaced 3 separate filter bars** (`ChannelFilterBar`, `SortFilterBar`, `DurationFilterBar`) with single `UnifiedFilterBar`
4. Applied filter to display data using `filterNaatsByDuration()`
5. Significantly reduced UI clutter

#### Web App (`apps/web/app/page.tsx`)

1. Added duration state: `useState<DurationOption>("all")`
2. Imported `DurationFilter` component
3. Added filter to both mobile and desktop layouts
4. Applied filter to display data using `filterNaatsByDuration()`

## User Experience

### Mobile ⭐ **IMPROVED**

- **Single Unified Filter Bar**: All filters in one compact horizontal bar
- Three filter buttons: **Sort** (always blue), **Channel**, **Duration**
- Tap any button to open modal with tabbed interface
- Active filters highlighted in blue (e.g., when channel or duration is selected)
- **"Clear" button** appears when non-default filters are active
- Modal provides organized access to all filter options
- **Clean, uncluttered interface** - reduced from 3 bars to 1

### Web

- **Desktop**: Dropdown in the filter bar alongside channel and sort filters
- **Mobile**: Horizontal scrollable pills similar to mobile app
- Positioned logically with other filters
- Maintains consistent styling with existing filters

## Technical Details

### Duration Calculation

- Naats store duration in seconds (`naat.duration`)
- Filter converts to minutes for comparison: `durationInMinutes = naat.duration / 60`
- Ranges:
  - Short: `< 5 minutes`
  - Medium: `>= 5 and <= 15 minutes`
  - Long: `> 15 minutes`

### Performance

- Client-side filtering (no API changes needed)
- Filters applied after data fetch
- Works with both browse and search results
- No impact on infinite scroll or pagination

### State Management

- Filter state persists during session
- Resets to "all" on app restart
- Independent of other filters (channel, sort)
- Can be combined with channel and sort filters

### UnifiedFilterBar Features

- **Modal State**: Uses React Native Modal for filter selection
- **Tab Navigation**: Three tabs for Sort, Channel, Duration
- **Visual Feedback**: Active selections shown with checkmarks
- **Smart Highlighting**: Blue background for active filters
- **Clear Action**: One-tap reset for channel and duration
- **Accessibility**: Large touch targets, clear labels

## Future Enhancements

Possible improvements:

1. **Custom Ranges**: Allow users to set custom duration ranges
2. **Persistence**: Save user's preferred duration filter
3. **Analytics**: Track which duration ranges are most popular
4. **Server-side**: Move filtering to API for better performance with large datasets
5. **Smart Defaults**: Suggest duration based on time of day or user behavior
6. **Filter Presets**: Save and recall favorite filter combinations

## Testing

To test the duration filter:

1. **Mobile App**:

   ```bash
   cd apps/mobile
   npm start
   ```

   - Tap the unified filter buttons (Sort, Channel, Duration)
   - Verify modal opens with correct tab
   - Test switching between tabs
   - Verify naats are filtered correctly
   - Check "Clear" button functionality
   - Confirm active filters are highlighted

2. **Web App**:

   ```bash
   cd apps/web
   npm run dev
   ```

   - Test dropdown on desktop
   - Test pills on mobile viewport
   - Verify filtering accuracy
   - Check responsive behavior

3. **Verify Filter Logic**:
   - Load naats with various durations
   - Select "< 5 min" - should only show short naats
   - Select "5-15 min" - should show medium-length naats
   - Select "> 15 min" - should show long naats
   - Select "All" - should show all naats
   - Combine with channel filter
   - Test "Clear" button

## Files Modified

### New Files

- `apps/mobile/components/UnifiedFilterBar.tsx` ⭐ **Main component**
- `apps/mobile/components/DurationFilterBar.tsx` (legacy)
- `apps/web/components/DurationFilter.tsx`
- `packages/shared/src/utils/durationFilter.ts`
- `docs/DURATION_FILTER.md`

### Modified Files

- `apps/mobile/app/index.tsx` (now uses UnifiedFilterBar)
- `apps/mobile/components/index.ts`
- `apps/web/app/page.tsx`
- `packages/shared/src/types.ts`
- `packages/shared/src/index.ts`

## Design Rationale

### Why Unified Filter?

The original implementation had **3 separate horizontal filter bars**:

1. Channel Filter Bar
2. Sort Filter Bar
3. Duration Filter Bar

**Problems:**

- Too much vertical space consumed
- Cluttered interface
- Difficult to see content
- Poor mobile UX

**Solution:**

- Single compact bar with 3 buttons
- Modal for detailed selection
- Tabbed interface for organization
- Visual indicators for active filters
- "Clear" button for quick reset

**Result:**

- Clean, professional interface
- More space for content
- Better user experience
- Follows mobile design best practices
