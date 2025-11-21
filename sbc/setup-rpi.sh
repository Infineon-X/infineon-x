#!/bin/bash

echo "=========================================="
echo "Face Recognition - Orange Pi Setup"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update

# Install dependencies
echo "📦 Installing system dependencies..."
sudo apt-get install -y build-essential cmake gfortran git wget curl \
    graphicsmagick libgraphicsmagick1-dev libatlas-base-dev \
    libavcodec-dev libavformat-dev libboost-all-dev libgtk2.0-dev \
    libjpeg-dev liblapack-dev libswscale-dev pkg-config \
    python3-dev python3-numpy python3-pip python3-venv zip

# Install picamera2 for newer Raspberry Pi OS (Bullseye+) with libcamera
echo "📷 Installing picamera2 for libcamera support..."
sudo apt-get install -y python3-picamera2 || echo "⚠️ picamera2 not available (may be older OS, will use OpenCV fallback)"

# Create virtual environment
echo "🔧 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install Python packages
echo "📦 Installing Python packages (this may take 15-20 hours on Orange Pi One)..."
pip install --upgrade pip
pip install -r requirements.txt


echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
