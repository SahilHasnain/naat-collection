# Implementation Plan

- [ ] 1. Enhance AppwriteService for channel filtering
  - Add getChannels() method to fetch distinct channels from database
  - Update getNaats() method to accept optional channelId parameter
  - Update searchNaats() method to accept optional channelId parameter
  - Update cache keys to include channelId in the key structure
  - _Requirements: 1.1, 3.1, 5.2_

- [ ] 2. Create useChannels hook
  - Implement hook to fetch available channels on mount
  - Add in-memory caching for channel list
  - Implement refresh function for pull-to-refresh support
  - Sort channels alphabetically by name
  - Handle empty channel list and error states
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [ ] 3. Update useNaats hook for channel filtering
  - Add channelId parameter to hook signature
  - Update cache key structure to include channelId
  - Reset state when channelId changes
  - Pass channelId to appwriteService.getNaats()
  - Maintain separate caches for each channel + sort combination
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Update useSearch hook for channel filtering
  - Add channelId parameter to hook signature
  - Pass channelId to appwriteService.searchNaats()
  - Update cache key to include channelId
  - _Requirements: 5.1, 5.2_

- [ ] 5. Create ChannelFilterBar component
  - Create new component with Channel interface and props
  - Render "All" option as first button (channelId = null)
  - Render discovered channels in alphabetical order
  - Implement selected state styling (blue for selected, neutral for unselected)
  - Add horizontal ScrollView with proper styling
  - Use emoji icons ("🌐" for All, "📺" for channels)
  - _Requirements: 2.1, 2.5, 1.4_

- [ ] 6. Refactor FilterBar to SortFilterBar
  - Rename FilterBar component to SortFilterBar
  - Rename FilterOption type to SortOption
  - Update imports in HomeScreen
  - Keep existing styling and behavior unchanged
  - _Requirements: 2.2_

- [ ] 7. Update HomeScreen for two-row filter layout
  - Add state for selectedChannelId
  - Integrate useChannels hook
  - Update useNaats hook call to pass channelId
  - Update useSearch hook call to pass channelId
  - Render ChannelFilterBar as first filter row
  - Render SortFilterBar as second filter row
  - Implement channel filter change handler
  - Ensure filter state persists during navigation
  - Reset filters to defaults on app restart
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.3, 3.4, 6.1, 6.2, 6.4_

- [ ] 8. Update pull-to-refresh to clear all filter caches
  - Clear channel list cache in useChannels
  - Clear all naat caches in useNaats (all channel + sort combinations)
  - Maintain selected channel and sort filters after refresh
  - _Requirements: 6.1, 6.3_

- [ ] 9. Update type definitions
  - Add Channel interface to types/index.ts
  - Update UseNaatsReturn if needed
  - Add UseChannelsReturn interface
  - Update IAppwriteService interface with new method signatures
  - Export SortOption type
  - _Requirements: 1.1, 3.1_

- [ ] 10. Enhance ingestion script for multiple channels
  - Update script to accept YOUTUBE_CHANNEL_IDS env variable (comma-separated)
  - Maintain backward compatibility with YOUTUBE_CHANNEL_ID
  - Process each channel sequentially in a loop
  - Store correct channelId and channelName for each video
  - Report ingestion statistics per channel
  - Add overall summary statistics
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ] 11. Update Appwrite Function for multiple channels
  - Update functions/ingest-videos/src/main.js with same multi-channel logic
  - Accept YOUTUBE_CHANNEL_IDS environment variable
  - Process channels sequentially
  - Return statistics for each channel in response
  - _Requirements: 4.1, 4.2, 4.3, 4.5_
