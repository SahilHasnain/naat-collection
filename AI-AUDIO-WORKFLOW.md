# AI Audio Processing Workflow

Complete workflow from setup to deployment.

## 📋 Complete Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    SETUP PHASE (One Time)                    │
└─────────────────────────────────────────────────────────────┘

1. Install Dependencies
   └─> npm install
   └─> Installs openai, ffmpeg, etc.

2. Configure API Key
   └─> Add OPENAI_API_KEY to .env.appwrite
   └─> Get from: https://platform.openai.com/api-keys

3. Test Setup
   └─> npm run ai-cut:test
   └─> Verifies all dependencies and API access

┌─────────────────────────────────────────────────────────────┐
│                   DISCOVERY PHASE                            │
└─────────────────────────────────────────────────────────────┘

4. Find Unprocessed Naats
   └─> npm run ai-cut:find
   └─> Lists all naats needing processing
   └─> Creates batch-cuts.json automatically
   └─> Shows cost estimate

┌─────────────────────────────────────────────────────────────┐
│                   TESTING PHASE                              │
└─────────────────────────────────────────────────────────────┘

5. Preview First Naat
   └─> npm run ai-cut:preview <youtubeId>
   └─> Shows what will be removed
   └─> No actual processing
   └─> Verify AI detection accuracy

6. Process Test Naat
   └─> npm run ai-cut:single <youtubeId>
   └─> Full processing of one naat
   └─> Review output quality
   └─> Listen to result

┌─────────────────────────────────────────────────────────────┐
│                   PRODUCTION PHASE                           │
└─────────────────────────────────────────────────────────────┘

7. Batch Process All
   └─> npm run ai-cut:batch
   └─> Processes all naats in batch-cuts.json
   └─> Progress saved to batch-results.json
   └─> Can resume if interrupted

8. Verify Results
   └─> Check batch-results.json
   └─> Review success/failure counts
   └─> Test random samples in app

┌─────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT PHASE                           │
└─────────────────────────────────────────────────────────────┘

9. App Automatically Uses Clean Audio
   └─> No code changes needed
   └─> cutAudio field takes precedence
   └─> Users get clean experience

10. Monitor & Maintain
    └─> Run ai-cut:find periodically
    └─> Process new naats as added
    └─> Review user feedback
```

## 🎯 Quick Commands Reference

### Setup

```bash
npm install                    # Install dependencies
npm run ai-cut:test           # Test setup
```

### Discovery

```bash
npm run ai-cut:find           # Find unprocessed naats
```

### Testing

```bash
npm run ai-cut:preview <id>   # Preview cuts (no processing)
npm run ai-cut:single <id>    # Process one naat
```

### Production

```bash
npm run ai-cut:batch          # Process all in batch-cuts.json
```

## 📊 Decision Tree

```
Start
  │
  ├─> First time?
  │   └─> Yes: Run ai-cut:test
  │   └─> No: Continue
  │
  ├─> Know which naats to process?
  │   └─> No: Run ai-cut:find
  │   └─> Yes: Continue
  │
  ├─> Want to preview first?
  │   └─> Yes: Run ai-cut:preview <id>
  │   └─> No: Continue
  │
  ├─> Processing one or many?
  │   └─> One: Run ai-cut:single <id>
  │   └─> Many: Run ai-cut:batch
  │
  └─> Done! App uses clean audio automatically
```

## 🔄 Typical First-Time Flow

```bash
# 1. Setup (5 minutes)
npm install
# Add OPENAI_API_KEY to .env.appwrite
npm run ai-cut:test

# 2. Discovery (1 minute)
npm run ai-cut:find
# Creates batch-cuts.json with all unprocessed naats

# 3. Test One (3 minutes)
npm run ai-cut:preview mgONEN7IqE8
npm run ai-cut:single mgONEN7IqE8
# Listen to result, verify quality

# 4. Process All (varies)
npm run ai-cut:batch
# Processes all naats in batch-cuts.json
# Monitor progress in batch-results.json

# 5. Done!
# App automatically uses clean audio
```

## 📈 Scaling Strategy

### Small Scale (< 10 naats)

```bash
# Process individually
npm run ai-cut:single <id1>
npm run ai-cut:single <id2>
# etc.
```

### Medium Scale (10-100 naats)

```bash
# Use batch processing
npm run ai-cut:find      # Creates batch-cuts.json
npm run ai-cut:batch     # Process all
```

### Large Scale (100+ naats)

```bash
# Split into smaller batches
# Edit batch-cuts.json to have 50 naats at a time
npm run ai-cut:batch

# After completion, update batch-cuts.json with next 50
npm run ai-cut:batch

# Repeat until all processed
```

## 🛠️ Maintenance Workflow

### Weekly/Monthly

```bash
# Check for new naats
npm run ai-cut:find

# If new naats found
npm run ai-cut:batch
```

### After Adding New Naats

```bash
# Process immediately
npm run ai-cut:single <newYoutubeId>
```

### Quality Check

```bash
# Preview random samples
npm run ai-cut:preview <randomId>

# Verify in app
# Listen to processed audio
# Check user feedback
```

## 🚨 Error Recovery

### If Batch Processing Fails

```bash
# Check batch-results.json for progress
# Remove successful naats from batch-cuts.json
# Re-run batch processing
npm run ai-cut:batch
```

### If Single Naat Fails

```bash
# Check error message
# Common fixes:
# - Verify YouTube ID is correct
# - Check naat has audioId
# - Verify OpenAI API credits
# - Check network connection

# Retry
npm run ai-cut:single <youtubeId>
```

## 💡 Pro Tips

1. **Always preview first** on new channels
   - Different channels may have different patterns
   - Verify AI detection accuracy

2. **Process in batches of 50**
   - Easier to monitor
   - Can pause/resume
   - Less risk if something fails

3. **Keep transcripts cached**
   - Don't delete `temp-ai-audio-cuts/transcripts/`
   - Saves money if you need to reprocess

4. **Monitor costs**
   - Check OpenAI usage dashboard
   - ~$0.15 per naat is typical

5. **Test on different channels**
   - Some channels may need prompt adjustments
   - Preview helps identify issues early

## 📚 Related Documentation

- **Quick Start**: `AI-AUDIO-QUICKSTART.md`
- **Technical Details**: `scripts/audio-processing/README.md`
- **Implementation**: `IMPLEMENTATION-SUMMARY.md`

## 🎉 Success Checklist

- [ ] Dependencies installed
- [ ] OpenAI API key configured
- [ ] Setup test passed
- [ ] Previewed at least one naat
- [ ] Processed test naat successfully
- [ ] Verified audio quality
- [ ] Batch processing completed
- [ ] App using clean audio
- [ ] Users happy with results

Congratulations! You've successfully implemented AI-powered audio processing! 🚀
