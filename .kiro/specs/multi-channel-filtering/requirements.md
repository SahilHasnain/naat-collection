# Requirements Document

## Introduction

This feature enables the Naat application to support multiple YouTube channels dynamically. Users can filter content by channel (or view all channels combined) while maintaining existing sort functionality. The system automatically discovers available channels from the database without hardcoding channel information.

## Glossary

- **Naat Application**: The mobile application that displays Islamic devotional content from YouTube channels
- **Channel Filter**: A UI control that allows users to filter naats by their source YouTube channel
- **Sort Filter**: A UI control that allows users to sort naats by latest, popular, or oldest
- **Appwrite Service**: The backend service layer that queries the Appwrite database
- **Filter Bar Component**: The React Native component that renders filter options
- **Dynamic Channel Discovery**: The process of automatically detecting available channels from database records

## Requirements

### Requirement 1

**User Story:** As a user, I want to see all available channels as filter options, so that I can browse content from specific channels without manual configuration

#### Acceptance Criteria

1. WHEN THE Naat Application loads, THE Appwrite Service SHALL fetch distinct channel information from the database
2. THE Naat Application SHALL display an "All" option plus one filter button for each discovered channel
3. WHEN a new channel is added to the database, THE Naat Application SHALL display that channel in the filter options after the next data refresh
4. THE Filter Bar Component SHALL render channel filters in alphabetical order by channel name
5. WHERE no channels exist in the database, THE Naat Application SHALL display only the "All" option

### Requirement 2

**User Story:** As a user, I want to filter naats by channel using a dedicated filter row, so that I can easily switch between viewing all content or content from a specific channel

#### Acceptance Criteria

1. THE Filter Bar Component SHALL render channel filters in the first row
2. THE Filter Bar Component SHALL render sort filters (Latest, Popular, Oldest) in the second row
3. WHEN a user selects a channel filter, THE Naat Application SHALL display only naats from that channel
4. WHEN a user selects the "All" filter, THE Naat Application SHALL display naats from all channels
5. THE Filter Bar Component SHALL visually indicate the currently selected channel filter

### Requirement 3

**User Story:** As a user, I want channel and sort filters to work together, so that I can view "Popular naats from Channel A" or "Latest naats from all channels"

#### Acceptance Criteria

1. WHEN a user selects both a channel filter and a sort filter, THE Appwrite Service SHALL apply both filters to the query
2. THE Naat Application SHALL maintain separate cache entries for each combination of channel and sort filters
3. WHEN a user changes the channel filter, THE Naat Application SHALL preserve the currently selected sort filter
4. WHEN a user changes the sort filter, THE Naat Application SHALL preserve the currently selected channel filter
5. THE Naat Application SHALL reset pagination offset when either filter changes

### Requirement 4

**User Story:** As a user, I want the ingestion script to support multiple channels, so that content from different YouTube channels can be imported into the same database

#### Acceptance Criteria

1. THE Ingestion Script SHALL accept multiple YouTube channel IDs as input
2. THE Ingestion Script SHALL process each channel sequentially
3. THE Ingestion Script SHALL store the correct channelId and channelName for each video
4. THE Ingestion Script SHALL prevent duplicate videos across channels using the youtubeId field
5. THE Ingestion Script SHALL report ingestion statistics separately for each channel

### Requirement 5

**User Story:** As a user, I want search functionality to work across all channels, so that I can find naats regardless of their source channel

#### Acceptance Criteria

1. WHEN a user performs a search, THE Appwrite Service SHALL search across all channels by default
2. WHEN a user has a channel filter active and performs a search, THE Appwrite Service SHALL search only within that channel
3. THE Naat Application SHALL display the channel name on each naat card in search results
4. WHEN a user clears the search, THE Naat Application SHALL restore the previously selected channel and sort filters
5. THE Search Bar Component SHALL remain visible when channel filters are active

### Requirement 6

**User Story:** As a user, I want the app to handle channel filter state correctly during refresh and navigation, so that my filter selections persist appropriately

#### Acceptance Criteria

1. WHEN a user performs pull-to-refresh, THE Naat Application SHALL maintain the currently selected channel and sort filters
2. WHEN a user returns to the home screen from the player screen, THE Naat Application SHALL maintain the previously selected filters
3. THE Naat Application SHALL clear all filter caches when the user performs a refresh action
4. WHEN the app restarts, THE Naat Application SHALL default to "All" channels and "Latest" sort order
5. THE Naat Application SHALL load initial data automatically when filters are changed
