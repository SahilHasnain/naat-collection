# Azure Deployment Checklist ✅

Use this checklist to ensure smooth deployment.

## Pre-Deployment

- [ ] Azure account with active credits
- [ ] GROQ_API_KEY ready (from .env file)
- [ ] List of YouTube URLs to process
- [ ] Local backup of your project

## Azure Portal Setup

- [ ] Create Resource Group (e.g., "naat-processing")
- [ ] Create Virtual Machine:
  - [ ] Image: Ubuntu Server 22.04 LTS
  - [ ] Size: NC4as_T4_v3 (or NC6s_v3 for faster)
  - [ ] Authentication: SSH public key
  - [ ] Inbound ports: SSH (22)
- [ ] Note down VM public IP address: `___________________`
- [ ] (Optional) Create Storage Account for results

## VM Initial Setup

- [ ] SSH into VM: `ssh azureuser@YOUR_VM_IP`
- [ ] Upload setup script:
  ```bash
  # On local machine
  scp scripts/audio-processing/azure-setup.sh azureuser@YOUR_VM_IP:~/
  ```
- [ ] Run setup script:
  ```bash
  chmod +x azure-setup.sh
  ./azure-setup.sh
  ```
- [ ] If NVIDIA drivers installed, reboot:
  ```bash
  sudo reboot
  # Wait 1 minute, SSH back in
  ./azure-setup.sh
  ```
- [ ] Verify GPU:
  ```bash
  nvidia-smi
  python3 -c "import torch; print(torch.cuda.is_available())"
  ```

## Project Deployment

Choose one method:

### Method A: Git Clone (Recommended)

- [ ] Clone repository:
  ```bash
  git clone YOUR_REPO_URL
  cd YOUR_REPO
  ```
- [ ] Install dependencies:
  ```bash
  npm install
  ```
- [ ] Create .env file:
  ```bash
  nano .env
  # Add: GROQ_API_KEY=your_key_here
  # Add: WHISPER_MODEL=large-v3
  ```

### Method B: SCP Upload

- [ ] Upload files from local:
  ```bash
  scp -r scripts/ package.json package-lock.json azureuser@YOUR_VM_IP:~/project/
  ```
- [ ] SSH into VM and install:
  ```bash
  cd ~/project
  npm install
  ```
- [ ] Create .env file (same as above)

## Testing

- [ ] Test with single short video:
  ```bash
  node scripts/audio-processing/process-naat-audio-azure-gpu.js https://youtu.be/SHORT_VIDEO_ID
  ```
- [ ] Check GPU usage during processing:
  ```bash
  # In another SSH session
  watch -n 1 nvidia-smi
  ```
- [ ] Verify output files:
  ```bash
  ls -lh temp-audio/processed/
  ```
- [ ] Download and review test results:
  ```bash
  # On local machine
  scp azureuser@YOUR_VM_IP:~/project/temp-audio/processed/* ./test-results/
  ```

## Batch Processing Setup

- [ ] Create video URLs file:
  ```bash
  nano video-urls.txt
  # Add your YouTube URLs, one per line
  ```
- [ ] Verify URLs format:
  ```bash
  cat video-urls.txt
  ```
- [ ] Estimate processing time:
  - Count videos: `wc -l video-urls.txt`
  - Estimate: ~12 minutes per 15-min video on T4
  - Total time: `_____ videos × 12 min = _____ minutes`

## Production Run

- [ ] Start batch processing:
  ```bash
  nohup node scripts/audio-processing/process-naat-audio-azure-gpu.js --batch video-urls.txt > processing.log 2>&1 &
  ```
- [ ] Note process ID: `_____`
- [ ] Monitor progress:
  ```bash
  tail -f processing.log
  ```
- [ ] Check GPU usage periodically:
  ```bash
  ./scripts/audio-processing/monitor-gpu.sh
  ```

## Results Collection

- [ ] Check completion:
  ```bash
  ls -lh temp-audio/processed/
  ```
- [ ] Download processed audio:
  ```bash
  # On local machine
  scp -r azureuser@YOUR_VM_IP:~/project/temp-audio/processed/ ./results-$(date +%Y%m%d)/
  ```
- [ ] Verify all files downloaded:
  ```bash
  ls -lh results-*/
  ```
- [ ] Review reports:
  ```bash
  cat results-*/*_report.txt
  ```

## Cleanup

- [ ] Backup important files from VM
- [ ] Delete temporary audio files:
  ```bash
  rm -rf temp-audio/*.m4a
  rm -rf temp-audio/*.json
  ```
- [ ] (Optional) Stop VM to save credits:
  ```bash
  # In Azure Portal: Stop VM
  ```
- [ ] (Optional) Delete VM if done:
  ```bash
  # In Azure Portal: Delete VM and associated resources
  ```

## Cost Tracking

- [ ] Note start time: `_____________________`
- [ ] Note end time: `_____________________`
- [ ] Total hours: `_____`
- [ ] VM cost/hour: `$_____`
- [ ] Estimated cost: `$_____`
- [ ] Check Azure Cost Management for actual cost

## Quality Verification

- [ ] Listen to 3-5 processed audio samples
- [ ] Compare with original videos
- [ ] Verify naat segments kept correctly
- [ ] Verify explanations removed correctly
- [ ] Check audio quality (no artifacts)
- [ ] Review classification accuracy in reports

## Troubleshooting Log

If you encounter issues, note them here:

| Issue | Solution | Time Lost |
| ----- | -------- | --------- |
|       |          |           |
|       |          |           |
|       |          |           |

## Post-Deployment

- [ ] Document any issues encountered
- [ ] Note optimal settings for future runs:
  - Model: `_____`
  - VM size: `_____`
  - Batch size: `_____`
- [ ] Calculate actual cost per video: `$_____`
- [ ] Decide if Azure GPU is worth it vs local processing

## Success Criteria

- [ ] All videos processed successfully
- [ ] Audio quality meets expectations
- [ ] Classification accuracy > 90%
- [ ] Cost within budget
- [ ] Processing time acceptable
- [ ] No data loss

---

## Quick Reference

**VM IP**: `_____________________`

**SSH Command**: `ssh azureuser@YOUR_VM_IP`

**Project Path**: `~/project/` or `~/YOUR_REPO/`

**Monitor GPU**: `watch -n 1 nvidia-smi`

**Check Progress**: `tail -f processing.log`

**Download Results**: `scp -r azureuser@YOUR_VM_IP:~/project/temp-audio/processed/ ./results/`

---

**Deployment Date**: `_____________________`

**Completed By**: `_____________________`

**Status**: ⬜ Planning | ⬜ In Progress | ⬜ Completed | ⬜ Issues
