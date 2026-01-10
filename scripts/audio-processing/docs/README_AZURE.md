# Naat Audio Processing on Azure GPU

Complete guide for running Whisper-based audio processing on Azure GPU VMs with your credits.

## 📁 Files Overview

```
scripts/audio-processing/
├── process-naat-audio-azure-gpu.js  # GPU-optimized processing script
├── process-naat-audio-local-v2.js   # Original local script
├── azure-setup.sh                   # Automated VM setup
├── monitor-gpu.sh                   # GPU monitoring tool
├── video-urls.txt                   # Batch processing URLs
├── QUICKSTART_AZURE.md              # 5-minute quick start
├── AZURE_DEPLOYMENT.md              # Detailed deployment guide
└── README_AZURE.md                  # This file
```

## 🎯 Why Azure GPU?

Your local script uses Whisper `tiny` model. On Azure GPU, you can use:

- **large-v3**: 10x more accurate, same speed as local `tiny`
- **Batch processing**: Process multiple videos automatically
- **No local resource usage**: Your machine stays free

## 🚀 Quick Start (Choose One)

### Option 1: Quick Test (5 minutes)

```bash
# See QUICKSTART_AZURE.md
```

### Option 2: Full Setup (15 minutes)

```bash
# See AZURE_DEPLOYMENT.md
```

## 💰 Cost with Your Azure Credits

| VM Type     | GPU  | Cost/Hour | 1 Hour Processes        |
| ----------- | ---- | --------- | ----------------------- |
| NC4as_T4_v3 | T4   | $0.526    | ~5 videos (15min each)  |
| NC6s_v3     | V100 | $3.06     | ~10 videos (15min each) |

**Recommendation**: Start with NC4as_T4_v3 (T4 GPU) - best value!

## 📊 Accuracy Comparison

| Version         | Model    | Accuracy | Speed  | Cost    |
| --------------- | -------- | -------- | ------ | ------- |
| Local (current) | tiny     | Good     | Fast   | Free    |
| Azure GPU       | large-v3 | **Best** | Fast   | Credits |
| Azure GPU       | medium   | Great    | Faster | Credits |

## 🎬 Usage Examples

### Single Video

```bash
node scripts/audio-processing/process-naat-audio-azure-gpu.js https://youtu.be/VIDEO_ID
```

### Batch Processing

```bash
# 1. Edit video-urls.txt with your URLs
nano video-urls.txt

# 2. Run batch
node scripts/audio-processing/process-naat-audio-azure-gpu.js --batch video-urls.txt
```

### Custom Model

```bash
# Use medium model (faster, still accurate)
WHISPER_MODEL=medium node scripts/audio-processing/process-naat-audio-azure-gpu.js URL

# Or set in .env
echo "WHISPER_MODEL=large-v3" >> .env
```

## 🔍 Monitoring

### Check GPU Usage

```bash
# One-time check
./scripts/audio-processing/monitor-gpu.sh

# Continuous monitoring
watch -n 1 nvidia-smi
```

### Check Processing Progress

```bash
# Watch logs
tail -f processing.log

# Check output directory
ls -lh temp-audio/processed/
```

## 📥 Getting Results Back

### Option 1: SCP (Recommended)

```bash
# From your local machine
scp -r azureuser@VM_IP:~/project/temp-audio/processed/ ./results/
```

### Option 2: Azure Storage

```bash
# On VM, upload to Azure Blob Storage
az storage blob upload-batch \
  --destination processed-audio \
  --source temp-audio/processed/ \
  --account-name YOUR_STORAGE_ACCOUNT
```

### Option 3: Git (for reports only)

```bash
# On VM
git add temp-audio/processed/*.json
git add temp-audio/processed/*.txt
git commit -m "Add processing reports"
git push
```

## 🎛️ Configuration Options

### Environment Variables (.env)

```bash
GROQ_API_KEY=your_key_here
WHISPER_MODEL=large-v3        # tiny, small, medium, large-v3
```

### Script Settings (edit process-naat-audio-azure-gpu.js)

```javascript
const PADDING_SECONDS = 0.3; // Padding around segments
const CROSSFADE_DURATION = 0.5; // Crossfade between segments
const MAX_SILENCE_DURATION = 2.0; // Max silence to keep
```

## 🔧 Troubleshooting

### GPU Not Detected

```bash
# Check NVIDIA driver
nvidia-smi

# If not found, run setup
./azure-setup.sh
sudo reboot
./azure-setup.sh
```

### Out of Memory

```bash
# Use smaller model
WHISPER_MODEL=medium node scripts/audio-processing/process-naat-audio-azure-gpu.js URL

# Or upgrade VM to NC6s_v3 (more RAM)
```

### Slow Processing

```bash
# Verify GPU is being used
nvidia-smi  # Should show python process

# Check model
echo $WHISPER_MODEL  # Should be set

# Verify CUDA
python3 -c "import torch; print(torch.cuda.is_available())"  # Should be True
```

## 💡 Best Practices

### 1. Start Small

- Test with 1 short video first
- Verify quality before batch processing
- Monitor GPU usage

### 2. Optimize Costs

```bash
# Auto-shutdown after 1 hour idle
sudo shutdown -h +60

# Use spot instances (90% cheaper)
# Enable in Azure Portal when creating VM
```

### 3. Batch Processing

```bash
# Process overnight
nohup node scripts/audio-processing/process-naat-audio-azure-gpu.js --batch video-urls.txt > processing.log 2>&1 &

# Check progress
tail -f processing.log
```

### 4. Backup Results

```bash
# Regularly download processed files
scp -r azureuser@VM_IP:~/project/temp-audio/processed/ ./backup-$(date +%Y%m%d)/
```

## 📈 Performance Tips

### Faster Processing

1. Use `medium` model instead of `large-v3` (2x faster, still great quality)
2. Upgrade to NC6s_v3 (V100 GPU) for 2x speed boost
3. Process multiple videos in parallel (if VM has enough RAM)

### Better Accuracy

1. Use `large-v3` model (best accuracy)
2. Increase `PADDING_SECONDS` to 0.5 (less aggressive cuts)
3. Review and adjust classification in Groq prompts

## 🆚 Comparison with Local Version

| Feature             | Local (Windows) | Azure GPU    |
| ------------------- | --------------- | ------------ |
| Model               | tiny            | large-v3     |
| Accuracy            | Good            | **Best**     |
| Speed (15min audio) | ~5 min          | ~12 min (T4) |
| Cost                | Free            | ~$0.11       |
| Batch Processing    | Manual          | Automated    |
| Resource Usage      | Your PC         | Cloud        |
| Scalability         | Limited         | Unlimited    |

## 🎓 Learning Resources

- [Whisper Models Comparison](https://github.com/openai/whisper#available-models-and-languages)
- [Azure NC-series VMs](https://learn.microsoft.com/en-us/azure/virtual-machines/nc-series)
- [FFmpeg Audio Filters](https://ffmpeg.org/ffmpeg-filters.html#Audio-Filters)

## 📞 Support

- **Quick issues**: Check QUICKSTART_AZURE.md
- **Detailed setup**: Check AZURE_DEPLOYMENT.md
- **GPU problems**: Run `./monitor-gpu.sh`

## 🎉 Next Steps

1. ✅ Set up Azure VM (QUICKSTART_AZURE.md)
2. ✅ Test with 1 video
3. ✅ Compare quality with local version
4. ✅ Batch process your collection
5. ✅ Download results
6. ✅ Shutdown VM to save credits

---

**Made with ❤️ for accurate Naat transcription**
