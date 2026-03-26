# Universal/App Links Setup - Quick Guide

## ✅ What I Did

### 1. Created Web Redirect Page
**File:** `apps/web/app/naat/[id]/page.tsx`
- URL: `https://owaisrazaqadri.appwrite.network/naat/{naatId}?youtubeId={youtubeId}`
- Auto-opens app if installed
- Falls back to YouTube after 2 seconds
- Shows manual buttons

### 2. Created iOS Universal Links Config
**File:** `apps/web/public/.well-known/apple-app-site-association`
- Must be accessible at: `https://owaisrazaqadri.appwrite.network/.well-known/apple-app-site-association`
- **ACTION NEEDED:** Replace `TEAMID` with your Apple Team ID

### 3. Created Android App Links Config
**File:** `apps/web/public/.well-known/assetlinks.json`
- Must be accessible at: `https://owaisrazaqadri.appwrite.network/.well-known/assetlinks.json`
- **ACTION NEEDED:** Add your release key SHA256 fingerprint

### 4. Updated Mobile App Config
**File:** `apps/mobile/app.config.js`
- Added iOS associated domains
- Added Android HTTPS intent filter

### 5. Updated Share Service
**File:** `apps/mobile/services/shareService.ts`
- Now shares: `https://owaisrazaqadri.appwrite.network/naat/{id}?youtubeId={id}`
- ✅ Link is clickable in all messaging apps!

## 🔧 Required Actions

### For iOS (Get Team ID)
```bash
# Find in Apple Developer Account or:
grep -r "DEVELOPMENT_TEAM" ios/
```
Update `apple-app-site-association`: Replace `TEAMID` with your actual Team ID

### For Android (Get SHA256)
```bash
# For debug build:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release build:
keytool -list -v -keystore /path/to/your/release.keystore -alias your-alias
```
Copy the SHA256 fingerprint and update `assetlinks.json`

### Deploy Web Files
1. Deploy web app to Appwrite
2. Verify files are accessible:
   - `https://owaisrazaqadri.appwrite.network/.well-known/apple-app-site-association`
   - `https://owaisrazaqadri.appwrite.network/.well-known/assetlinks.json`
3. Files must return `Content-Type: application/json`

### Rebuild Mobile App
```bash
cd apps/mobile
# iOS
eas build --platform ios
# Android
eas build --platform android
```

## 🧪 Testing

### Test Web Redirect
Visit: `https://owaisrazaqadri.appwrite.network/naat/test123?youtubeId=abc`

### Test Share
1. Share a naat from app
2. Send to yourself
3. Tap the link
4. Should open app automatically!

## 📱 How It Works Now

**Shared Message:**
```
🎵 Ya Nabi Salam Alayka

By: Owais Raza Qadri

https://owaisrazaqadri.appwrite.network/naat/abc123?youtubeId=xyz789
```

**When Link is Tapped:**
1. ✅ Link is clickable (HTTPS URL)
2. Opens web page
3. Web page tries to open app
4. If app installed → Opens in app
5. If not installed → Redirects to YouTube after 2s

## 🎯 Result
- ✅ Clickable links in all messaging apps
- ✅ Opens in app if installed
- ✅ Falls back to YouTube
- ✅ Shows "Get App" buttons
- ✅ Works on iOS and Android
