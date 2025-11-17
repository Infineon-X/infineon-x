#!/bin/bash

set -e

APP_DIR="/opt/face-api"
WORK_DIR="$APP_DIR"
if [ -d "$APP_DIR/backend" ]; then
    WORK_DIR="$APP_DIR/backend"
fi

echo "🔄 Updating Face Recognition API..."

cd $APP_DIR
git pull

cd $WORK_DIR
source venv/bin/activate
pip install -r requirements.txt --quiet

echo "🔄 Restarting service..."
sudo systemctl restart face-api

echo "✅ Update complete!"
echo "🔍 Check logs: sudo journalctl -u face-api -f"

