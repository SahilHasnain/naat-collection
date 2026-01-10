# Azure GPU VM Deployment Guide

## Step 1: Create GPU VM in Azure Portal

### Recommended VM Sizes:

- **NC6s_v3**: 1x V100 GPU, 6 cores, 112GB RAM (~$3.06/hour)
- **NC4as_T4_v3**: 1x T4 GPU, 4 cores, 16GB RAM (~$0.526/hour)

### VM Configuration:

1. Go to Azure Portal → Virtual Machines → Create
2. **Basics**:
   - Image: Ubuntu Server 22.04 LTS
   - Size: NC4as_T4_v3 or NC6s_v3
   - Authentication: SSH public key (recommended)
3. **Disks**:
   - OS disk: Premium SSD (128GB minimum)
   - Add data disk: 256GB+ for audio files
4. **Networking**:
   - Allow SSH (port 22)
   - Create new NSG
5. **Review + Create**

## Step 2: Connect to VM

```bash
# SSH into your VM
ssh azureuser@<your-vm-ip>
```

## Step 3: Run Setup Script

```bash
# Upload setup script
scp scripts/audio-processing/azure-setup.sh azureuser@<your-vm-ip>:~/

# On VM, run setup
chmod +x azure-setup.sh
./azure-setup.sh

# If NVIDIA drivers were just installed, reboot
sudo reboot

# After reboot, SSH back in and run setup again
./azure-setup.sh
```

## Step 4: Upload Your Project

### Option A: Git Clone (Recommended)

```bash
git clone <your-repo-url>
cd <your-repo>
npm install
```

### Option B: SCP Upload

```bash
# From your local machine
scp -r scripts/ package.json package-lock.json azureuser@<your-vm-ip>:~/project/
ssh azureuser@<your-vm-ip>
cd ~/project
npm install
```

## Step 5: Configure Environment

```bash
# Create .env file
nano .env

# Add your API key:
GROQ_API_KEY=your_groq_api_key_here
```

## Step 6: Run Processing

```bash
# Process a single video
node scripts/audio-processing/process-naat-audio-local-v2.js https://youtu.be/VIDEO_ID

# Or use the default test video
node scripts/audio-processing/process-naat-audio-local-v2.js
```

## Step 7: Download Processed Files

```bash
# From your local machine
scp -r azureuser@<your-vm-ip>:~/project/temp-audio/processed/ ./local-processed/
```

## Performance Optimization

### Use Larger Whisper Model (Better Accuracy)

Edit `process-naat-audio-local-v2.js` line 127:

```javascript
// Change from:
"--model", "tiny",

// To:
"--model", "large-v3",  // Best accuracy, slower
// Or:
"--model", "medium",    // Good balance
```

### Batch Processing Multiple Videos

Create a batch script:

```bash
#!/bin/bash
# batch-process.sh

VIDEOS=(
  "https://youtu.be/VIDEO_ID_1"
  "https://youtu.be/VIDEO_ID_2"
  "https://youtu.be/VIDEO_ID_3"
)

for video in "${VIDEOS[@]}"; do
  echo "Processing: $video"
  node scripts/audio-processing/process-naat-audio-local-v2.js "$video"
done
```

## Cost Optimization

### Auto-Shutdown When Idle

```bash
# Install auto-shutdown script
sudo nano /usr/local/bin/auto-shutdown.sh
```

Add:

```bash
#!/bin/bash
IDLE_TIME=3600  # 1 hour in seconds
if [ $(uptime -s | cut -d: -f1) -gt $IDLE_TIME ]; then
    sudo shutdown -h now
fi
```

```bash
sudo chmod +x /usr/local/bin/auto-shutdown.sh
# Add to crontab
(crontab -l 2>/dev/null; echo "*/15 * * * * /usr/local/bin/auto-shutdown.sh") | crontab -
```

### Use Spot Instances

- Save up to 90% on VM costs
- Good for non-critical batch processing
- Enable in VM creation: Availability options → Spot instance

## Monitoring GPU Usage

```bash
# Watch GPU usage in real-time
watch -n 1 nvidia-smi

# Check if Whisper is using GPU
python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

## Troubleshooting

### CUDA Not Available

```bash
# Check NVIDIA driver
nvidia-smi

# Reinstall PyTorch with CUDA
pip3 install --force-reinstall torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Out of Memory

- Use smaller Whisper model (`tiny` or `small`)
- Or upgrade to larger VM (NC6s_v3 with 112GB RAM)

### Slow Processing

- Verify GPU is being used: `nvidia-smi` should show python process
- Check model size: `large-v3` is much slower than `tiny`

## Expected Performance

| Model    | GPU  | Speed (15min audio) | Accuracy |
| -------- | ---- | ------------------- | -------- |
| tiny     | T4   | ~2 minutes          | Good     |
| small    | T4   | ~4 minutes          | Better   |
| medium   | T4   | ~8 minutes          | Great    |
| large-v3 | V100 | ~6 minutes          | Best     |
| large-v3 | T4   | ~12 minutes         | Best     |

## Storage Management

```bash
# Check disk usage
df -h

# Clean up old audio files
rm -rf temp-audio/*.m4a
rm -rf temp-audio/*.json

# Keep only processed files
find temp-audio/processed -type f -mtime +7 -delete  # Delete files older than 7 days
```

## Security Best Practices

1. **Use SSH keys** (not passwords)
2. **Restrict SSH access** to your IP only
3. **Keep .env file secure** (never commit to git)
4. **Update regularly**: `sudo apt-get update && sudo apt-get upgrade`
5. **Use Azure Key Vault** for API keys in production

## Next Steps

1. Test with a short video first
2. Monitor GPU usage and costs
3. Optimize model size based on accuracy needs
4. Set up automated batch processing if needed
5. Configure auto-shutdown to save credits
