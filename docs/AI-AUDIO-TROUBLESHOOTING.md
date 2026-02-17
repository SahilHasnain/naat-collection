# AI Audio Processing - Troubleshooting Guide

Common issues and solutions.

## 🔧 Setup Issues

### "Cannot find module 'openai'"

**Problem**: OpenAI package not installed

**Solution**:

```bash
npm install
```

### "OPENAI_API_KEY not found"

**Problem**: API key not configured

**Solution**:

1. Get API key from https://platform.openai.com/api-keys
2. Add to `.env.appwrite`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```

### "OpenAI API error: Incorrect API key"

**Problem**: Invalid or expired API key

**Solution**:

1. Verify key in OpenAI dashboard
2. Generate new key if needed
3. Update `.env.appwrite`

### "You exceeded your current quota"

**Problem**: No credits in OpenAI account

**Solution**:

1. Go to https://platform.openai.com/account/billing
2. Add payment method
3. Add credits ($10 minimum)

## 🎤 Transcription Issues

### "Whisper transcription failed"

**Possible causes**:

- Audio file corrupted
- File too large (>25MB)
- Network timeout
- API rate limit

**Solutions**:

```bash
# Check audio file exists
ls temp-ai-audio-cuts/*_original.m4a

# Check file size
# If > 25MB, may need to compress first

# Retry after a minute (rate limit)
npm run ai-cut:single <youtubeId>
```

### "Detected language: unknown"

**Problem**: Whisper couldn't detect language

**Solution**:

- Audio quality may be poor
- Try re-downloading audio
- Check if audio is actually speech

## 🤖 AI Analysis Issues

### "GPT-4 analysis failed"

**Possible causes**:

- Network timeout
- API rate limit
- Invalid response format

**Solutions**:

```bash
# Check transcript exists
cat temp-ai-audio-cuts/transcripts/<youtubeId>_transcript.json

# Retry
npm run ai-cut:single <youtubeId>
```

### "No explanations detected" (but there are explanations)

**Problem**: GPT-4 couldn't distinguish explanations

**Solutions**:

1. Check transcript manually
2. Adjust GPT-4 prompt in `ai-cut-audio.js`
3. Provide more context about the channel

**Example prompt adjustment**:

```javascript
const prompt = `You are analyzing a naat from ${naat.channelName}.
This channel typically has explanations at the beginning and end.
...`;
```

### "Could not map explanations to timestamps"

**Problem**: Phrase matching failed

**Solutions**:

1. Check transcript for exact phrases
2. GPT-4 may have used paraphrased text
3. Adjust phrase matching logic

**Debug**:

```bash
# Preview to see what GPT-4 detected
npm run ai-cut:preview <youtubeId>

# Check transcript
cat temp-ai-audio-cuts/transcripts/<youtubeId>_transcript.json
```

## ✂️ Audio Cutting Issues

### "FFmpeg error: Invalid argument"

**Problem**: Segment timestamps invalid

**Solutions**:

- Check segments don't overlap
- Verify timestamps are within audio duration
- Check for negative durations

**Debug**:

```bash
# Preview cuts first
npm run ai-cut:preview <youtubeId>

# Check segment logic
```

### "Audio cut successfully but sounds wrong"

**Problem**: Wrong segments removed

**Solutions**:

1. Preview first to verify
2. Adjust GPT-4 prompt
3. Manual review of transcript

```bash
# Always preview first
npm run ai-cut:preview <youtubeId>
```

### "Output audio is silent"

**Problem**: All audio was removed

**Solutions**:

- Check keepSegments in logs
- GPT-4 may have marked everything as explanation
- Adjust prompt to be more conservative

## 📤 Upload Issues

### "Failed to upload audio"

**Possible causes**:

- Network timeout
- Appwrite storage full
- File too large
- Permission issues

**Solutions**:

```bash
# Check Appwrite storage quota
# Check file size
ls -lh temp-ai-audio-cuts/*_cut.m4a

# Retry
npm run ai-cut:single <youtubeId>
```

### "Failed to update document"

**Problem**: Database update failed

**Solutions**:

- Check Appwrite permissions
- Verify naat document exists
- Check API key has write access

## 🔍 Database Issues

### "Naat not found with YouTube ID"

**Problem**: YouTube ID doesn't exist in database

**Solutions**:

```bash
# Verify YouTube ID is correct
# Check database manually
# Ensure naat was ingested
```

### "No audio file found"

**Problem**: Naat has no audioId field

**Solutions**:

1. Run audio upload script first
2. Verify audio exists in storage
3. Check naat document has audioId

```bash
# Upload audio first
npm run upload:audio
```

## 📦 Batch Processing Issues

### "batch-cuts.json not found"

**Problem**: Configuration file missing

**Solutions**:

```bash
# Auto-generate from database
npm run ai-cut:find

# Or create manually
echo '{"youtubeIds":["id1","id2"]}' > batch-cuts.json
```

### "Batch processing stopped"

**Problem**: Script crashed or interrupted

**Solutions**:

1. Check `batch-results.json` for progress
2. Remove successful naats from `batch-cuts.json`
3. Resume processing

```bash
# Check results
cat batch-results.json

# Edit batch-cuts.json to remove completed
# Re-run
npm run ai-cut:batch
```

## 🐛 General Debugging

### Enable Verbose Logging

Add to script:

```javascript
console.log("Debug info:", variable);
```

### Check Temporary Files

```bash
# List temp files
ls -la temp-ai-audio-cuts/

# Check transcripts
ls -la temp-ai-audio-cuts/transcripts/

# View transcript
cat temp-ai-audio-cuts/transcripts/<youtubeId>_transcript.json
```

### Test Individual Steps

```bash
# 1. Test download only
# Comment out steps after download in ai-cut-audio.js

# 2. Test transcription only
# Use cached audio, comment out later steps

# 3. Test analysis only
# Use cached transcript
```

## 💰 Cost Issues

### "Costs higher than expected"

**Causes**:

- Long audio files
- Re-processing same naats
- Not using cached transcripts

**Solutions**:

1. Keep transcript cache
2. Don't delete `temp-ai-audio-cuts/transcripts/`
3. Preview before processing
4. Process in smaller batches

### "Want to reduce costs"

**Options**:

1. Use cached transcripts (free re-processing)
2. Process only naats with known explanations
3. Batch process to reduce overhead
4. Use preview to avoid unnecessary processing

## 🔄 Recovery Procedures

### Start Fresh

```bash
# Delete temp files
rm -rf temp-ai-audio-cuts/

# Delete batch results
rm batch-results.json

# Re-run setup test
npm run ai-cut:test

# Start over
npm run ai-cut:find
```

### Recover from Failed Batch

```bash
# 1. Check what succeeded
cat batch-results.json

# 2. Extract failed IDs
# (manually or with script)

# 3. Create new batch-cuts.json with only failed

# 4. Retry
npm run ai-cut:batch
```

## 📞 Getting Help

### Check Logs

All scripts output detailed logs. Look for:

- ❌ Error messages
- ⚠️ Warnings
- ✓ Success indicators

### Verify Environment

```bash
npm run ai-cut:test
```

### Check Documentation

- `AI-AUDIO-QUICKSTART.md` - Quick start
- `scripts/audio-processing/README.md` - Technical details
- `AI-AUDIO-WORKFLOW.md` - Complete workflow

### Common Error Patterns

| Error                | Likely Cause       | Quick Fix              |
| -------------------- | ------------------ | ---------------------- |
| "Cannot find module" | Missing dependency | `npm install`          |
| "API key"            | Not configured     | Add to `.env.appwrite` |
| "Quota exceeded"     | No credits         | Add credits to OpenAI  |
| "Naat not found"     | Wrong YouTube ID   | Verify ID              |
| "No audio file"      | Missing audioId    | Run upload script      |
| "FFmpeg error"       | Invalid segments   | Preview first          |

## ✅ Prevention Checklist

Before processing:

- [ ] Run `ai-cut:test` to verify setup
- [ ] Run `ai-cut:find` to identify naats
- [ ] Run `ai-cut:preview` on first naat
- [ ] Verify preview results make sense
- [ ] Check OpenAI credits available
- [ ] Ensure stable internet connection
- [ ] Have enough disk space for temp files

During processing:

- [ ] Monitor console output
- [ ] Check for errors immediately
- [ ] Don't interrupt batch processing
- [ ] Keep `batch-results.json` for recovery

After processing:

- [ ] Verify success in `batch-results.json`
- [ ] Test random samples in app
- [ ] Listen to processed audio
- [ ] Keep transcript cache for future use

## 🎯 Best Practices

1. **Always preview first** on new channels
2. **Process in small batches** (50 at a time)
3. **Keep transcript cache** to save money
4. **Monitor costs** in OpenAI dashboard
5. **Test thoroughly** before batch processing
6. **Have backup plan** for failed processing
7. **Document custom prompts** for different channels

## 🚀 Performance Tips

1. **Use cached transcripts** - saves time and money
2. **Batch process** - more efficient than individual
3. **Parallel processing** - run multiple instances (careful with rate limits)
4. **Clean temp files** - only after verifying success
5. **Monitor progress** - check `batch-results.json` regularly

Remember: When in doubt, preview first! 🔍
