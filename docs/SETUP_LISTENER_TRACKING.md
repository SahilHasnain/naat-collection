# Quick Setup: Listener Tracking

## Step 1: Create Appwrite Collection

```bash
cd scripts/setup
node setup-live-radio-listeners.js
```

Expected output:
```
🎵 Setting up Live Radio Listeners collection...
✅ Collection created: live_radio_listeners
✅ Created lastHeartbeat attribute
✅ Created deviceInfo attribute
✅ Created lastHeartbeat index
✅ Live Radio Listeners collection setup complete!
```

## Step 2: Deploy Cleanup Function (Optional)

1. Go to Appwrite Console → Functions
2. Create new function: `cleanup-stale-listeners`
3. Upload `functions/cleanup-stale-listeners/src/main.js`
4. Add environment variables:
   - `APPWRITE_DATABASE_ID`: Your database ID
5. Set schedule: `*/5 * * * *` (every 5 minutes)
6. Deploy

## Step 3: Test

1. Start the app
2. Play live radio
3. Check Appwrite Console → Databases → live_radio_listeners
4. You should see a document with your device info
5. Stop playback
6. Document should be deleted

## Step 4: Verify Count

1. Open app on multiple devices
2. Start live radio on all devices
3. Check the listener count badge on the live screen
4. Should show the correct number

## That's It! 🎉

The listener count will now show real-time data based on active listeners.

## Troubleshooting

If count shows 0:
```bash
# Check if collection exists
# In Appwrite Console: Databases → [Your DB] → live_radio_listeners

# Check app logs for errors
# Look for: [LiveRadio] Error registering listener
```

If count doesn't decrease:
```bash
# Deploy the cleanup function (Step 3)
# Or manually delete old documents from Appwrite Console
```
