# Live Radio Listener Tracking

## Overview

Real-time listener count tracking using Appwrite database and heartbeat mechanism.

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Client App (Playing Live Radio)                        │
│                                                          │
│  1. Start playing → Create listener document            │
│  2. Every 30s → Update lastHeartbeat timestamp          │
│  3. Stop/Pause → Delete listener document               │
└─────────────────────────────────────────────────────────┘
                            ↓
                   [Appwrite Database]
                   live_radio_listeners
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌───────────────┐                      ┌───────────────┐
│  Query Count  │                      │ Cleanup Func  │
│  (Every 30s)  │                      │ (Every 5 min) │
│               │                      │               │
│ Count docs    │                      │ Delete docs   │
│ with recent   │                      │ older than    │
│ heartbeat     │                      │ 5 minutes     │
└───────────────┘                      └───────────────┘
```

## Database Schema

### Collection: `live_radio_listeners`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$id` | string | Yes | Unique listener ID (device-based) |
| `lastHeartbeat` | string | Yes | ISO timestamp of last heartbeat |
| `deviceInfo` | string | No | Device model and OS info |
| `$createdAt` | string | Auto | When listener first joined |
| `$updatedAt` | string | Auto | Last update time |

### Permissions
- Read: `Role.any()` - Anyone can query listener count
- Create: `Role.any()` - Anyone can register as listener
- Update: `Role.any()` - Anyone can update their heartbeat
- Delete: `Role.any()` - Anyone can unregister

### Indexes
- `lastHeartbeat_index` - For efficient queries on recent listeners

## Implementation

### 1. Setup Collection

```bash
cd scripts/setup
node setup-live-radio-listeners.js
```

This creates:
- `live_radio_listeners` collection
- Required attributes
- Index on `lastHeartbeat`

### 2. Client-Side (Automatic)

The `LiveRadioService` automatically:
- Registers listener when playback starts
- Sends heartbeat every 30 seconds
- Unregisters when playback stops/pauses

### 3. Cleanup Function (Optional but Recommended)

Deploy the `cleanup-stale-listeners` function:

```bash
# In Appwrite Console:
# 1. Create new function: cleanup-stale-listeners
# 2. Upload functions/cleanup-stale-listeners/src/main.js
# 3. Set schedule: */5 * * * * (every 5 minutes)
# 4. Add environment variables:
#    - APPWRITE_DATABASE_ID
```

## Listener Count Logic

### Active Listener Definition
A listener is considered "active" if:
- Document exists in `live_radio_listeners` collection
- `lastHeartbeat` is within last 60 seconds

### Query
```javascript
const cutoffTime = new Date(Date.now() - 60000).toISOString();
const activeListeners = await databases.listDocuments(
  databaseId,
  'live_radio_listeners',
  [Query.greaterThan('lastHeartbeat', cutoffTime)]
);
const count = activeListeners.total;
```

## Heartbeat Mechanism

### Timing
- **Heartbeat Interval**: 30 seconds
- **Active Threshold**: 60 seconds (2x heartbeat)
- **Stale Threshold**: 5 minutes (cleanup)

### Why These Values?

1. **30s Heartbeat**: Balance between accuracy and API calls
   - Too frequent: Wastes API quota
   - Too infrequent: Inaccurate count

2. **60s Active**: Allows for one missed heartbeat
   - Network hiccup won't immediately remove listener
   - Still responsive (updates within 30-60s)

3. **5min Stale**: Cleanup old documents
   - Handles app crashes (no cleanup on exit)
   - Prevents collection bloat

## Edge Cases Handled

### 1. App Crash
- Listener document remains in database
- Cleanup function removes after 5 minutes
- Count may be inflated for up to 5 minutes

### 2. Network Loss
- Heartbeat fails silently
- After 60s, listener no longer counted
- Reconnection creates new heartbeat

### 3. Background/Foreground
- Heartbeat continues in background (if playback continues)
- Stops when app is killed or playback stops

### 4. Multiple Devices (Same User)
- Each device gets unique listener ID
- All devices counted separately
- Correct behavior (same person, different streams)

## Performance

### API Calls Per Listener
- Register: 1 call (on start)
- Heartbeat: 1 call per 30s = 120 calls/hour
- Unregister: 1 call (on stop)
- Count query: 1 call per 30s = 120 calls/hour

### Total for 100 Listeners
- Heartbeats: 12,000 calls/hour
- Count queries: 120 calls/hour
- **Total: ~12,120 calls/hour**

### Appwrite Limits
- Free tier: 75,000 requests/day = 3,125/hour
- Pro tier: Unlimited

**Recommendation**: For >200 concurrent listeners, use Pro tier.

## Privacy Considerations

### Data Collected
- Device model and OS (optional, for analytics)
- Timestamps (when listening)
- No personal information

### Data Retention
- Active listeners: While playing
- Stale listeners: Max 5 minutes after stop
- No long-term storage

### GDPR Compliance
- No PII collected
- Data deleted automatically
- Anonymous tracking

## Monitoring

### Check Current Listeners
```bash
# In Appwrite Console:
# Databases → [Your DB] → live_radio_listeners
# View documents to see active listeners
```

### Metrics to Track
- Peak concurrent listeners
- Average session duration
- Listener churn rate
- Geographic distribution (if added)

## Future Enhancements

### 1. Geographic Distribution
Add `country` field to show listener map

### 2. Listening History
Track total listening time per user

### 3. Realtime Count Updates
Subscribe to collection changes for instant count updates

### 4. Listener Leaderboard
Show top listeners by total time

### 5. Social Features
- See what friends are listening to
- Chat with other listeners
- React to tracks together

## Troubleshooting

### Count Always Shows 0
1. Check collection exists: `live_radio_listeners`
2. Check permissions: `Role.any()` for read/create/update
3. Check logs for heartbeat errors
4. Verify `expo-device` package installed

### Count Doesn't Decrease
1. Check cleanup function is running
2. Verify function has correct permissions
3. Check function logs for errors

### Count Too High
1. Stale listeners not cleaned up
2. Deploy cleanup function
3. Manually delete old documents

### Heartbeat Errors
1. Check network connection
2. Verify Appwrite endpoint accessible
3. Check API key permissions
