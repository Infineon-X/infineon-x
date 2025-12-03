#!/bin/bash

echo "=========================================="
echo "Face Recognition - Orange Pi Setup"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update

# Install dependencies needed for both face recognition and audio-test.py
echo "📦 Installing system dependencies (including audio support)..."
sudo apt-get install -y build-essential cmake gfortran git wget curl \
    graphicsmagick libgraphicsmagick1-dev libatlas-base-dev \
    libavcodec-dev libavformat-dev libboost-all-dev libgtk2.0-dev \
    libjpeg-dev liblapack-dev libswscale-dev pkg-config \
    python3-dev python3-numpy python3-pip python3-venv zip ffmpeg ffplay \
    alsa-utils portaudio19-dev libasound2 libasound2-plugins

# Recommend checking audio output device
echo "🔊 Checking for audio output devices..."
aplay -l || echo "⚠️  No audio device detected - check your Orange Pi audio output!"

# Create virtual environment
echo "🔧 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip and wheel for audio-related installs
pip install --upgrade pip wheel setuptools

# Install Python packages
echo "📦 Installing Python packages (this may take 15-20 hours on Orange Pi One)..."
pip install -r requirements.txt

# Install packages needed for audio-test.py
echo "📦 Installing extra packages for audio-test.py..."
pip install edge-tts sounddevice soundfile

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "You can now run: source venv/bin/activate && python3 audio-test.py"
echo "If audio output doesn't play, verify your Orange Pi has a working audio device and ffplay is installed."

