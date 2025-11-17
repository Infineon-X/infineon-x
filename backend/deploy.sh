#!/bin/bash

set -e

# Default repo URL
GIT_REPO="${1:-https://github.com/infineon-x/infineon-x.git}"
APP_DIR="/opt/face-api"

echo "🚀 Deploying Face Recognition API to Digital Ocean Droplet..."
echo "📦 Repository: $GIT_REPO"

# Update system
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install dependencies
echo "📦 Installing system dependencies..."
sudo apt install -y python3-pip python3-venv git
sudo apt install -y build-essential cmake libopenblas-dev liblapack-dev libgl1 libglib2.0-0

# Clone or update repository

if [ -d "$APP_DIR/.git" ]; then
    echo "📥 Updating existing repository..."
    cd $APP_DIR
    git pull
else
    echo "📥 Cloning repository..."
    sudo rm -rf $APP_DIR
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    git clone $GIT_REPO $APP_DIR
fi

# Working directory is always backend folder (since code is in backend/)
WORK_DIR="$APP_DIR/backend"

cd $WORK_DIR

# Setup virtual environment
echo "🐍 Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create systemd service
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/face-api.service > /dev/null <<EOF
[Unit]
Description=Face Recognition API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORK_DIR
Environment="PATH=$WORK_DIR/venv/bin"
ExecStart=$WORK_DIR/venv/bin/gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 120 api.app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
echo "🔄 Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable face-api
sudo systemctl start face-api

# Check status
echo "✅ Checking service status..."
sleep 2
sudo systemctl status face-api --no-pager

echo ""
echo "🎉 Deployment complete!"
echo "📍 API running on: http://$(curl -s ifconfig.me):8080"
echo "🔍 Check logs: sudo journalctl -u face-api -f"
echo "🛑 Stop service: sudo systemctl stop face-api"

