# YouTube Cookie Setup Guide

YouTube has implemented bot detection that blocks automated requests. To fix this, you need to provide authenticated cookies from your browser.

## Quick Setup (Recommended)

### 1. Install Browser Extension

Install "Get cookies.txt LOCALLY" extension:

- **Chrome/Edge**: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
- **Firefox**: https://addons.mozilla.org/en-US/firefox/addon/get-cookies-txt-locally/

### 2. Export YouTube Cookies

1. Visit https://youtube.com and make sure you're logged in
2. Click the extension icon
3. Click "Export" or "Download"
4. Save as `youtube-cookies.txt`

### 3. Encode Cookies

Run the helper script:

```bash
cd functions/tools
node export-youtube-cookies.js /path/to/youtube-cookies.txt
```

This will output a base64-encoded string.

### 4. Add to Environment Variables

**For Appwrite Cloud Functions:**

1. Go to your Appwrite Console
2. Navigate to Functions → extract-audio
3. Go to Settings → Environment Variables
4. Add new variable:
   - Key: `YOUTUBE_COOKIES`
   - Value: (paste the base64 string from step 3)

**For Local Development:**
Add to your `.env` file:

```
YOUTUBE_COOKIES=<base64-string-here>
```

## Alternative: Browser Cookie Extraction

If you prefer not to use an extension, you can use browser DevTools:

### Chrome/Edge DevTools Method

1. Visit youtube.com (logged in)
2. Open DevTools (F12)
3. Go to Application → Cookies → https://youtube.com
4. Manually create a Netscape format file with these cookies (at minimum):
   - `VISITOR_INFO1_LIVE`
   - `CONSENT`
   - `PREF`
   - `YSC`
   - `LOGIN_INFO`
   - `SID`, `HSID`, `SSID`, `APISID`, `SAPISID`

Format (tab-separated):

```
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	TRUE	0	COOKIE_NAME	COOKIE_VALUE
```

## Troubleshooting

### Still Getting Bot Detection?

- Make sure you're logged into YouTube in the browser you exported cookies from
- Try exporting cookies again (they may have expired)
- Cookies typically last 1-2 weeks before needing refresh

### Function Still Failing?

- Check Appwrite Function logs for cookie initialization messages
- Verify the base64 string was copied completely (no line breaks)
- Ensure the environment variable name is exactly `YOUTUBE_COOKIES`

### Cookie Expiration

YouTube cookies expire periodically. If extraction starts failing again:

1. Export fresh cookies
2. Re-encode them
3. Update the environment variable

## Security Notes

- Never commit cookie files to git
- Cookies contain authentication tokens - treat them like passwords
- The function stores cookies temporarily in memory only
- Consider rotating cookies regularly for security
