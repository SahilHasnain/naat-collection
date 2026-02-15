# Live Radio Simplification

## What Changed

The live radio feature has been simplified from a complex position-syncing system to a straightforward shared playlist approach.

### Old Approach (Complex)

- Backend tracked `currentNaatId` and `startedAt` timestamp
- Clients calculated playback position based on elapsed time
- Required clock synchronization between server and clients
- Prone to drift, buffering issues, and desync
- Track advancement delayed up to 5 minutes

### New Approach (Simple)

- Backend maintains a fixed rotating playlist (50 tracks)
- Backend tracks `currentTrackIndex` in the playlist
- Clients play `playlist[currentTrackIndex]` from the beginning
- No position calculation needed
- Everyone hears the same track sequence (not necessarily same position)
- Much more reliable and maintainable

## Database Schema Changes

### Before

```javascript
{
  currentNaatId: string,      // ID of current track
  startedAt: string,          // ISO timestamp
  playlist: string[],         // Upcoming tracks
  updatedAt: string
}
```

### After

```javascript
{
  currentTrackIndex: number,  // Index in playlist (0-49)
  playlist: string[],         // Fixed rotating playlist
  updatedAt: string
}
```

## Migration Steps

1. **Update Database Schema**

   ```bash
   # Delete old collection (if you have data you want to keep, export it first)
   # Then run the setup script
   node scripts/setup/setup-live-radio.js
   ```

2. **Deploy Backend Function**
   - Deploy the updated `functions/live-radio-manager`
   - Update scheduled execution to run every 3 minutes (instead of 5)

3. **Initialize Playlist**

   ```bash
   # Test locally first
   node scripts/testing/test-live-radio.js

   # Or trigger the function manually in Appwrite console
   ```

4. **Deploy Mobile App**
   - The mobile app changes are backward compatible
   - Users will automatically use the new system

## Benefits

✅ No more position sync issues
✅ No more clock drift problems
✅ Simpler backend logic
✅ Faster track advancement
✅ More reliable playback
✅ Easier to debug and maintain

## How It Works Now

1. Backend maintains a playlist of 50 random naats
2. Every 3 minutes, backend checks if current track duration has elapsed
3. If elapsed, backend increments `currentTrackIndex` (wraps around at end)
4. Clients subscribe to realtime updates
5. When index changes, clients load and play the new track from beginning
6. Everyone hears the same track, creating a "radio" experience

## Notes

- Users won't hear the exact same position in a track (that's okay!)
- The "radio" feel comes from everyone hearing the same track sequence
- Much simpler and more reliable than trying to sync positions
- Playlist rotates automatically when it reaches the end
