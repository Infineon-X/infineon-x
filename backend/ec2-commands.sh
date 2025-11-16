#!/bin/bash

# Quick Reference Commands for EC2 Face Recognition API
# This script provides helper functions for managing the API on EC2

APP_DIR="/opt/face-recognition-api"
SERVICE_NAME="face-recognition-api"

case "$1" in
    start)
        echo "🚀 Starting Face Recognition API..."
        sudo systemctl start $SERVICE_NAME
        sudo systemctl status $SERVICE_NAME
        ;;
    stop)
        echo "🛑 Stopping Face Recognition API..."
        sudo systemctl stop $SERVICE_NAME
        ;;
    restart)
        echo "🔄 Restarting Face Recognition API..."
        sudo systemctl restart $SERVICE_NAME
        sudo systemctl status $SERVICE_NAME
        ;;
    status)
        echo "📊 Service Status:"
        sudo systemctl status $SERVICE_NAME
        ;;
    logs)
        echo "📋 Viewing logs (Ctrl+C to exit)..."
        sudo journalctl -u $SERVICE_NAME -f
        ;;
    logs-error)
        echo "❌ Viewing error logs..."
        sudo journalctl -u $SERVICE_NAME -p err -f
        ;;
    install-deps)
        echo "📦 Installing Python dependencies..."
        sudo -u faceapi $APP_DIR/venv/bin/pip install -r $APP_DIR/requirements.txt
        echo "✅ Dependencies installed. Restart service: sudo systemctl restart $SERVICE_NAME"
        ;;
    test)
        echo "🧪 Testing API..."
        curl -s http://localhost:5001/health | python3 -m json.tool
        ;;
    test-remote)
        if [ -z "$2" ]; then
            echo "Usage: $0 test-remote <EC2_IP_ADDRESS>"
            exit 1
        fi
        echo "🧪 Testing API on $2..."
        curl -s http://$2:5001/health | python3 -m json.tool
        ;;
    update)
        echo "🔄 Updating application..."
        echo "1. Stop service..."
        sudo systemctl stop $SERVICE_NAME
        echo "2. Backup current version..."
        sudo cp -r $APP_DIR/api $APP_DIR/api.backup.$(date +%Y%m%d_%H%M%S)
        echo "3. Copy new files (make sure files are in ~/api/)..."
        if [ -d ~/api ]; then
            sudo cp -r ~/api/* $APP_DIR/api/
            sudo chown -R faceapi:faceapi $APP_DIR/api
            echo "✅ Files updated"
        else
            echo "❌ ~/api directory not found. Upload files first."
            exit 1
        fi
        echo "4. Start service..."
        sudo systemctl start $SERVICE_NAME
        sudo systemctl status $SERVICE_NAME
        ;;
    *)
        echo "Face Recognition API - EC2 Management Commands"
        echo "=============================================="
        echo "Usage: $0 {start|stop|restart|status|logs|logs-error|install-deps|test|test-remote|update}"
        echo ""
        echo "Commands:"
        echo "  start          - Start the API service"
        echo "  stop           - Stop the API service"
        echo "  restart        - Restart the API service"
        echo "  status         - Check service status"
        echo "  logs           - View live logs (follow mode)"
        echo "  logs-error     - View only error logs"
        echo "  install-deps   - Install/update Python dependencies"
        echo "  test           - Test API locally (health check)"
        echo "  test-remote    - Test API on remote EC2 (requires IP)"
        echo "  update         - Update application files from ~/api/"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs"
        echo "  $0 test-remote 54.123.45.67"
        echo "  $0 update"
        exit 1
        ;;
esac

