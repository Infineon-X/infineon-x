#!/bin/bash

set -e

APP_DIR="/opt/face-api"
WORK_DIR="$APP_DIR/backend"

echo "🔄 Updating Face Recognition API..."

# Pull latest code
cd $APP_DIR
git pull

# Update dependencies
cd $WORK_DIR
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    pip install -r requirements.txt --quiet
else
    echo "⚠️  Virtual environment not found. Run deploy.sh first."
    exit 1
fi

# Restart service
echo "🔄 Restarting service..."
sudo systemctl restart face-api

echo "✅ Update complete!"
echo "🔍 Check logs: sudo journalctl -u face-api -f"

