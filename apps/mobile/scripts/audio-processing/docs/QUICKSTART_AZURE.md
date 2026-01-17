# Azure GPU Quick Start Guide

## 🚀 Fast Setup (5 minutes)

### 1. Create Azure VM

```bash
# In Azure Portal:
# - Create VM → Ubuntu 22.04
# - Size: NC4as_T4_v3 (cheapest GPU option)
# - Allow SSH
```

### 2. Connect & Setup

```bash
# SSH into VM
ssh azureuser@YOUR_VM_IP

# Download and run setup script
wget https://raw.githubusercontent.com/YOUR_REPO/main/scripts/audio-processing/azure-setup.sh
chmod +x azure-setup.sh
./azure-setup.sh

# If it installs NVIDIA drivers, reboot and run again:
sudo reboot
# ... wait 1 minute, SSH back in ...
./azure-setup.sh
```

### 3. Upload Your Project

```bash
# Option A: Git clone
git clone YOUR_REPO_URL
cd YOUR_REPO
npm install

# Option B: Upload from local
# (run this on your local machine)
scp -r scripts/ package.json package-lock.json .env azureuser@YOUR_VM_IP:~/project/
```

### 4. Run Processing

```bash
# Single video
node scripts/audio-processing/process-naat-audio-azure-gpu.js https://youtu.be/VIDEO_ID

# Batch processing
# First, create video-urls.txt with your URLs
node scripts/audio-processing/process-naat-audio-azure-gpu.js --batch video-urls.txt
```

### 5. Download Results

```bash
# On your local machine
scp -r azureuser@YOUR_VM_IP:~/project/temp-audio/processed/ ./results/
```

## 💡 Tips

### Use Large Model for Best Accuracy

```bash
# Set environment variable
export WHISPER_MODEL=large-v3

# Or edit .env file
echo "WHISPER_MODEL=large-v3" >> .env
```

### Monitor GPU Usage

```bash
# Watch GPU in real-time
watch -n 1 nvidia-smi
```

### Save Credits - Auto Shutdown

```bash
# Shutdown after 1 hour of idle
sudo shutdown -h +60
```

## 📊 Performance Comparison

| Model    | GPU  | Time (15min audio) | Accuracy |
| -------- | ---- | ------------------ | -------- |
| tiny     | T4   | ~2 min             | Good     |
| medium   | T4   | ~8 min             | Great    |
| large-v3 | T4   | ~12 min            | **Best** |
| large-v3 | V100 | ~6 min             | **Best** |

## 💰 Cost Estimate (with Azure credits)

| VM Size     | GPU  | Cost/Hour | 15min Video |
| ----------- | ---- | --------- | ----------- |
| NC4as_T4_v3 | T4   | $0.526    | ~$0.11      |
| NC6s_v3     | V100 | $3.06     | ~$0.31      |

**Recommendation**: Use NC4as_T4_v3 with `large-v3` model for best value.

## 🔧 Troubleshooting

### "CUDA not available"

```bash
# Check NVIDIA driver
nvidia-smi

# If not installed, run setup again
./azure-setup.sh
```

### "Whisper not found"

```bash
pip3 install -U openai-whisper
```

### "yt-dlp not found"

```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

## 📞 Need Help?

Check the full guide: `AZURE_DEPLOYMENT.md`
