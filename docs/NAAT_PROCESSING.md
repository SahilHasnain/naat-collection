# Naat Audio Processing

This script processes naat audio to separate the actual naat (singing) from explanatory speech.

## How It Works

1. **Download** - Gets audio from YouTube using yt-dlp
2. **Transcribe** - Uses Groq Whisper API (Urdu language support)
3. **Analyze** - Llama 3.1 identifies naat vs explanation segments
4. **Cut** - FFmpeg removes explanation parts
5. **Report** - Generates detailed accuracy report

## Prerequisites

- yt-dlp installed (already have it)
- Groq API key in .env (already set)
- Dependencies installed: `npm install`

## Usage

### Process first naat from database:

```bash
npm run process:naat
```

### Process specific video:

```bash
node scripts/process-naat-audio.js --video-id=YOUTUBE_ID
```

## Output

All files are saved to `temp-audio/processed/`:

- `{youtubeId}_processed.m4a` - Audio with explanations removed
- `{youtubeId}_report.json` - Detailed JSON report
- `{youtubeId}_report.txt` - Human-readable report

## Testing Accuracy

1. Run the script
2. Listen to original audio in `temp-audio/`
3. Listen to processed audio in `temp-audio/processed/`
4. Review the report to see identified segments
5. Check if:
   - All naat parts are preserved
   - All explanations are removed
   - No cuts in the middle of naat

## Report Structure

The report includes:

- Full transcription with timestamps
- Identified segments (naat vs explanation)
- Confidence levels for each segment
- Reasoning for classification
- File locations

## Next Steps

After testing accuracy:

- If good: Scale to 5 videos, then integrate with backend
- If poor: Adjust prompts or try different approach
- Consider manual review workflow for edge cases
