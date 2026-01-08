# Sentry Setup Complete! 🎉

## Project Details

- **Organization**: sahil-hasnain
- **Project**: ubaid-raza-naats
- **Project ID**: 4510675297501264
- **Dashboard**: https://sahil-hasnain.sentry.io/projects/ubaid-raza-naats/

## DSN (Already Configured)

```
https://26f7852901dbe4c65a101e2300db1d8f@o4509954219966464.ingest.de.sentry.io/4510675297501264
```

This DSN is already added to:

- `.env` file
- `eas.json` (all build profiles)
- `app.json` (Sentry plugin config)

## What's Configured

### 1. Sentry SDK Installed

- `@sentry/react-native` package installed
- Expo plugin configured in `app.json`

### 2. Error Tracking

- All unhandled errors are automatically captured
- Appwrite API errors are tracked with context
- Initialization errors are logged

### 3. Performance Monitoring

- 100% of transactions tracked
- User interaction tracing enabled
- Native frame tracking enabled

### 4. Debug Mode

- Console logs in development for all Sentry events
- Breadcrumbs for Appwrite initialization

## How to Use

### View Errors in Sentry Dashboard

1. Go to: https://sahil-hasnain.sentry.io/projects/ubaid-raza-naats/
2. Click "Issues" to see all errors
3. Click any issue to see:
   - Stack trace
   - Device info
   - Breadcrumbs (what happened before the error)
   - User context

### Test Sentry (Optional)

Add this button to your app to test error tracking:

```typescript
import * as Sentry from '@sentry/react-native';

// Test error
<Button
  title="Test Sentry"
  onPress={() => {
    Sentry.captureException(new Error('Test error from app!'));
  }}
/>

// Test crash
<Button
  title="Test Crash"
  onPress={() => {
    throw new Error('Test crash!');
  }}
/>
```

### Debugging Crashes

When your app crashes:

1. **Check Sentry Dashboard** (recommended)
   - Go to https://sahil-hasnain.sentry.io/projects/ubaid-raza-naats/
   - View the latest issue
   - See full stack trace and context

2. **Check ADB Logcat** (alternative)

   ```cmd
   adb logcat *:E
   ```

3. **Check Console in Development**
   - All Sentry events are logged to console when `__DEV__` is true
   - Look for "📤 Sentry Event:" in logs

## What Gets Tracked

### Automatically Tracked

- Unhandled JavaScript errors
- Native crashes (Android/iOS)
- Promise rejections
- React component errors (via ErrorBoundary)

### Manually Tracked (in your code)

- Appwrite API errors with context:
  - Request parameters
  - Error type
  - Component name
- Appwrite initialization status

## Build & Deploy

### Development Build

```cmd
eas build --profile development --platform android
```

### Preview Build

```cmd
eas build --profile preview --platform android
```

### Production Build

```cmd
eas build --profile production --platform android
```

All builds will automatically include Sentry tracking!

## Sentry Features Available

### Issues Tab

- See all errors grouped by type
- Filter by resolved/unresolved
- Assign to team members
- Add comments

### Performance Tab

- See slow API calls
- Track app startup time
- Monitor screen load times

### Releases Tab

- Track errors by app version
- See which version has most errors
- Compare error rates between versions

## Tips

1. **Set User Context** (optional)

   ```typescript
   Sentry.setUser({
     id: "user-id",
     email: "user@example.com",
   });
   ```

2. **Add Custom Tags**

   ```typescript
   Sentry.setTag("screen", "home");
   Sentry.setTag("feature", "video-player");
   ```

3. **Add Breadcrumbs**

   ```typescript
   Sentry.addBreadcrumb({
     message: "User clicked play button",
     category: "user-action",
     level: "info",
   });
   ```

4. **Disable in Development** (if needed)
   In `app/_layout.tsx`, change:
   ```typescript
   enableInExpoDevelopment: false, // Only track in production
   ```

## Next Steps

1. **Build your app**: `eas build --profile preview --platform android`
2. **Install and test**: Reproduce the crash
3. **Check Sentry**: Go to dashboard and see the error with full context
4. **Fix the issue**: Use stack trace and context to debug
5. **Deploy fix**: Build and deploy new version

## Need Help?

- Sentry Docs: https://docs.sentry.io/platforms/react-native/
- Your Dashboard: https://sahil-hasnain.sentry.io/projects/ubaid-raza-naats/
- Issues: Check the "Issues" tab in Sentry dashboard
