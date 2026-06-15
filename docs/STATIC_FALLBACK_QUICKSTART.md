# Static Fallback - Quick Start (5 Minutes)

## **Emergency Solution for Exceeded Database Limits**

---

## **Step 1: Generate Export** (2 mins)

```bash
cd d:\projects\naat-collection
node scripts/export-naats-to-json.js
```

**Output:**
```
📥 Fetching all naats from Appwrite...
✅ Fetched 3000 naats
✅ Saved: static-exports/naats-export.json (4.2 MB)
✅ Saved: static-exports/channels-export.json (45 KB)
```

---

## **Step 2: Update GitHub URLs** (1 min)

Edit: `apps/mobile/config/appwrite.ts`

**Find this:**
```typescript
export const STATIC_FALLBACK_URLS = {
  NAATS: '...USERNAME/naat-collection...',  // ← HERE
  CHANNELS: '...USERNAME/naat-collection...',
};
```

**Replace `USERNAME` with your actual GitHub username.**

---

## **Step 3: Commit & Push** (1 min)

```bash
git add .
git commit -m "Add static fallback for database limits"
git push origin main
```

---

## **Step 4: Test CDN** (1 min)

Wait 2 minutes, then visit:
```
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/naat-collection@main/static-exports/naats-export.json
```

Should show JSON data. ✅

---

## **DONE!** 

App will now automatically fall back to static JSON when database limits exceeded.

**Users will see:**
- 📦 Banner: "Limited Mode Active"  
- All features still work
- Data is cached (not real-time)

---

## **Optional: Add Banner to UI**

Edit your main screen component:

```typescript
import { FallbackModeBanner } from '@/components/FallbackModeBanner';

export default function HomeScreen() {
  return (
    <View>
      <FallbackModeBanner />  {/* ← Add this */}
      {/* ... rest of your UI */}
    </View>
  );
}
```

---

## **Monthly Update** (when limits reset)

```bash
node scripts/export-naats-to-json.js
git add static-exports/
git commit -m "Update exports"
git push
```

---

## **That's It!**

Your app now has emergency fallback ready. 🎉

**Note:** This only solves database reads. Audio bandwidth still from Appwrite.  
For full solution, migrate audio to external CDN later.
