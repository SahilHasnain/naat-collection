# Scripts Directory

This directory contains all automation and utility scripts for the Naat Collection project, organized by functionality.

## 📁 Directory Structure

### 🎵 audio-processing/

Audio processing scripts for naat videos with different strategies and optimizations.

- **process-naat-audio.js** - Base audio processing script
- **process-naat-audio-hybrid.js** - Hybrid approach (Groq Whisper + OpenAI GPT-4o-mini) - Best accuracy + low cost (~$0.007/video)
- **process-naat-audio-openai.js** - OpenAI-only version (Whisper + GPT-4)
- **process-naat-audio-optimized.js** - Optimized version for performance
- **process-naat-audio-smooth.js** - Version with smooth crossfade transitions
- **process-naat-local.js** - Local processing without external APIs
- **process-naat-production.js** - Production-ready version

**Usage:**

```bash
node scripts/audio-processing/process-naat-audio-hybrid.js
```

### ⚙️ setup/

Initial setup and configuration scripts for the project infrastructure.

- **setup-appwrite.js** - Initialize Appwrite backend
- **setup-audio-bucket.js** - Configure audio storage bucket
- **setup-audio-cache.js** - Set up audio caching system
- **setup-channels-collection.js** - Create channels collection in database
- **enable-long-paths.ps1** - Windows PowerShell script to enable long path support

**Usage:**

```bash
node scripts/setup/setup-appwrite.js
```

### 📊 data-management/

Scripts for managing and manipulating data in the system.

- **add-audio-attribute.js** - Add audio attributes to existing records
- **add-channels.js** - Add new channels to the database
- **ingest-videos.js** - Bulk import videos into the system
- **delete-all-videos.js** - Remove all videos (use with caution!)
- **update-bucket-permissions.js** - Modify storage bucket permissions

**Usage:**

```bash
node scripts/data-management/ingest-videos.js
```

### 🛠️ utilities/

Standalone utility scripts for various tasks.

- **download-audio.js** - Download audio from video sources
- **transcribe-local.py** - Local transcription using Python
- **generate-adaptive-icon.js** - Generate adaptive icons for the app

**Usage:**

```bash
node scripts/utilities/download-audio.js
python scripts/utilities/transcribe-local.py
```

### 🧪 testing/

Test scripts for validating functionality.

- **test-bucket.js** - Test bucket operations
- **test-small-upload.js** - Test small file uploads
- **test-upload.js** - Test general upload functionality

**Usage:**

```bash
node scripts/testing/test-bucket.js
```

## 🚀 Quick Start

1. **Initial Setup:**

   ```bash
   node scripts/setup/setup-appwrite.js
   node scripts/setup/setup-audio-bucket.js
   ```

2. **Process Audio:**

   ```bash
   node scripts/audio-processing/process-naat-audio-hybrid.js
   ```

3. **Ingest Videos:**
   ```bash
   node scripts/data-management/ingest-videos.js
   ```

## 📝 Notes

- Most scripts require environment variables to be set (check `.env` file)
- Audio processing scripts use different AI services (OpenAI, Groq) - ensure API keys are configured
- Test scripts before running in production
- The hybrid audio processing approach offers the best balance of accuracy and cost

## 🔧 Requirements

- Node.js (v16+)
- Python (for transcribe-local.py)
- FFmpeg (for audio processing)
- Valid API keys for OpenAI/Groq (depending on script)
- Appwrite instance configured

## ⚠️ Caution

Scripts in `data-management/` can modify or delete data. Always backup before running:

- `delete-all-videos.js` - Destructive operation
- `update-bucket-permissions.js` - Changes access controls
