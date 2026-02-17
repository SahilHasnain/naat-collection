# AI Audio Processing - Quick Start Guide

Remove explanations from naat audio automatically using AI.

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Add OpenAI API Key

Add to `.env.appwrite`:

```env
OPENAI_API_KEY=sk-your-key-here
```

Get your key: https://platform.openai.com/api-keys

### 3. Test Setup

```bash
npm run ai-cut:test
```

Should show all ✅ checks passed.

## 🔍 Find Naats to Process

```bash
npm run ai-cut:find
```

This will:

- List all naats with audio but no cutAudio
- Create `batch-cuts.json` automatically
- Show cost estimate

## 🎯 Process Your First Naat

### Preview First (Recommended)

See what will be removed before processing:

```bash
npm run ai-cut:preview mgONEN7IqE8
```

This shows:

- Detected explanation segments
- Timestamps and durations
- What phrases will be removed
- Final audio length

### Single Naat

```bash
npm run ai-cut:process mgONEN7IqE8
```

Replace `mgONEN7IqE8` with your YouTube ID.

### Watch the Magic ✨

The script will:

1. Download audio from Appwrite
2. Transcribe with Whisper (word-level timestamps)
3. Analyze with GPT-4 (identify explanations)
4. Cut audio (remove explanations)
5. Upload clean audio
6. Update database

Takes ~2-3 minutes per naat.

## 📦 Batch Processing

### 1. Create `batch-cuts.json`

```json
{
  "youtubeIds": ["mgONEN7IqE8", "anotherYoutubeId", "yetAnotherOne"]
}
```

### 2. Run Batch

```bash
npm run ai-cut:batch
```

Progress saved to `batch-results.json` after each naat.

## 💰 Cost

~$0.15 per naat (Whisper + GPT-4)

100 naats = ~$15

## 🎓 How It Works

```
Audio → Whisper (transcribe) → GPT-4 (analyze) → FFmpeg (cut) → Clean Audio
```

**Why this works:**

- Whisper gives word-level timestamps
- GPT-4 understands context (naat vs explanation)
- Fully automated, no manual work
- ~95% accuracy

## 📊 Example Output

```
Processing: mgONEN7IqE8
✓ Found: Beautiful Naat Title
✓ Downloaded audio
✓ Transcription complete
✓ Identified 3 explanation segments
  ✓ 12.5s - 22.3s: Introduction by speaker
  ✓ 228.1s - 316.4s: Mid-naat explanation
  ✓ 1140.2s - 1155.8s: Closing remarks
✓ Audio cut successfully
✓ Uploaded to storage
✓ Database updated
✅ Processing complete!
```

## 🔧 Troubleshooting

### "OpenAI API error"

- Check API key is valid
- Ensure you have credits

### "Naat not found"

- Verify YouTube ID is correct
- Check naat exists in database

### "No audio file"

- Naat must have `audioId` field
- Run audio upload script first

## 📚 Full Documentation

See `scripts/audio-processing/README.md` for:

- Detailed architecture
- Advanced configuration
- Cost breakdown
- Troubleshooting guide

## 🎉 Success!

Once processed, your app will automatically use the clean audio (cutAudio field takes precedence over audioId).

Users get pure naat content without interruptions!
