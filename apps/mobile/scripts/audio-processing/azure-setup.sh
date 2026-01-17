#!/bin/bash
# Azure GPU VM Setup Script for Whisper Audio Processing
# Run this on a fresh Ubuntu 20.04/22.04 VM with GPU

set -e

echo "🚀 Setting up Azure GPU VM for Whisper Audio Processing..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install essential tools
echo "🔧 Installing essential tools..."
sudo apt-get install -y \
    build-essential \
    git \
    curl \
    wget \
    software-properties-common

# Install NVIDIA drivers and CUDA (if not already installed)
echo "🎮 Checking NVIDIA GPU..."
if ! command -v nvidia-smi &> /dev/null; then
    echo "Installing NVIDIA drivers..."
    sudo apt-get install -y ubuntu-drivers-common
    sudo ubuntu-drivers autoinstall
    echo "⚠️  NVIDIA drivers installed. Please reboot and run this script again."
    exit 0
else
    echo "✓ NVIDIA drivers already installed"
    nvidia-smi
fi

# Install Python 3.10+
echo "🐍 Installing Python..."
sudo apt-get install -y python3 python3-pip python3-venv
python3 --version

# Install PyTorch with CUDA support
echo "🔥 Installing PyTorch with CUDA support..."
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install Whisper with GPU support
echo "🎤 Installing OpenAI Whisper..."
pip3 install -U openai-whisper

# Install ffmpeg
echo "🎬 Installing FFmpeg..."
sudo apt-get install -y ffmpeg

# Install yt-dlp
echo "📥 Installing yt-dlp..."
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Install Node.js 18.x
echo "📗 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

# Verify GPU setup
echo ""
echo "🔍 Verifying GPU setup..."
python3 -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA version: {torch.version.cuda}'); print(f'GPU count: {torch.cuda.device_count()}'); print(f'GPU name: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Clone your repository or upload your scripts"
echo "2. Run: npm install"
echo "3. Create .env file with GROQ_API_KEY"
echo "4. Run: node scripts/audio-processing/process-naat-audio-local-v2.js [youtube-url]"
echo ""
echo "💡 To test Whisper GPU:"
echo "   python3 -c 'import whisper; model = whisper.load_model(\"tiny\"); print(\"Whisper loaded successfully!\")'"
