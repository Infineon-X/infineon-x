#!/bin/bash

# Face Recognition API EC2 Setup Script
# This script sets up the Flask Face Recognition API on an EC2 instance
# Supports Amazon Linux 2023 and Ubuntu 22.04

set -e  # Exit on error

echo "🚀 Starting Face Recognition API Setup on EC2..."
echo "================================================"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Cannot detect OS. Exiting."
    exit 1
fi

echo "📦 Detected OS: $OS"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Install system dependencies based on OS
print_status "Installing system dependencies..."

if [ "$OS" == "amzn" ] || [ "$OS" == "amazon" ]; then
    # Amazon Linux 2023
    dnf update -y
    dnf groupinstall -y "Development Tools"
    dnf install -y python3.10 python3.10-pip python3.10-devel \
        cmake gcc gcc-c++ make \
        openblas-devel lapack-devel \
        libgl libglib2.0 \
        git wget curl \
        firewalld
    
    # Start and enable firewall
    systemctl start firewalld
    systemctl enable firewalld
    
elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
    # Ubuntu/Debian
    apt-get update -y
    apt-get install -y python3.10 python3.10-venv python3.10-dev python3-pip \
        build-essential cmake \
        libopenblas-dev liblapack-dev \
        libgl1 libglib2.0-0 \
        git wget curl \
        ufw
    
    # Configure firewall
    ufw --force enable
else
    print_error "Unsupported OS: $OS"
    exit 1
fi

# Create application user
print_status "Creating application user..."
if ! id -u faceapi > /dev/null 2>&1; then
    useradd -r -s /bin/bash -d /opt/face-recognition-api -m faceapi
    print_status "User 'faceapi' created"
else
    print_warning "User 'faceapi' already exists"
fi

# Create application directory
APP_DIR="/opt/face-recognition-api"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/temp_enrollments

# Set up Python virtual environment
print_status "Setting up Python virtual environment..."
if [ -d "$APP_DIR/venv" ]; then
    print_warning "Virtual environment already exists, skipping..."
else
    python3.10 -m venv $APP_DIR/venv
    print_status "Virtual environment created"
fi

# Install Python packages
print_status "Installing Python packages..."
$APP_DIR/venv/bin/pip install --upgrade pip setuptools wheel
print_status "Pip upgraded"

# Note: Requirements will be installed when app files are uploaded
# This is a placeholder - actual installation happens after files are copied

# Configure firewall
print_status "Configuring firewall..."

if [ "$OS" == "amzn" ] || [ "$OS" == "amazon" ]; then
    # Amazon Linux - firewalld
    firewall-cmd --permanent --add-port=5001/tcp
    firewall-cmd --permanent --add-port=80/tcp
    firewall-cmd --permanent --add-port=22/tcp
    firewall-cmd --reload
    print_status "Firewall configured (firewalld)"
elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
    # Ubuntu - ufw
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 5001/tcp
    print_status "Firewall configured (ufw)"
fi

# Create systemd service file
print_status "Creating systemd service..."
cat > /etc/systemd/system/face-recognition-api.service << 'EOF'
[Unit]
Description=Face Recognition API Service
After=network.target

[Service]
Type=simple
User=faceapi
Group=faceapi
WorkingDirectory=/opt/face-recognition-api
Environment="PATH=/opt/face-recognition-api/venv/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/opt/face-recognition-api/venv/bin/gunicorn \
    -w 2 \
    -b 0.0.0.0:5001 \
    --timeout 120 \
    --access-logfile /opt/face-recognition-api/logs/access.log \
    --error-logfile /opt/face-recognition-api/logs/error.log \
    --log-level info \
    api.app:app
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

print_status "Systemd service file created"

# Set permissions
print_status "Setting permissions..."
chown -R faceapi:faceapi $APP_DIR
chmod +x $APP_DIR/venv/bin/* 2>/dev/null || true

# Reload systemd and enable service
print_status "Reloading systemd..."
systemctl daemon-reload

# Create a README for the user
cat > $APP_DIR/README_SETUP.txt << 'EOF'
Face Recognition API - Setup Instructions
==========================================

1. Upload your application files:
   - api/ directory (contains app.py)
   - requirements.txt
   - encodings.pkl (if exists)

2. Install Python dependencies:
   sudo -u faceapi /opt/face-recognition-api/venv/bin/pip install -r /opt/face-recognition-api/requirements.txt

3. Start the service:
   sudo systemctl start face-recognition-api
   sudo systemctl enable face-recognition-api

4. Check status:
   sudo systemctl status face-recognition-api

5. View logs:
   sudo journalctl -u face-recognition-api -f

6. Test the API:
   curl http://localhost:5001/health
EOF

chown faceapi:faceapi $APP_DIR/README_SETUP.txt

print_status "Setup complete!"
echo ""
echo "================================================"
echo "📝 Next Steps:"
echo "================================================"
echo "1. Upload your application files to: $APP_DIR"
echo "2. Install dependencies:"
echo "   sudo -u faceapi $APP_DIR/venv/bin/pip install -r $APP_DIR/requirements.txt"
echo "3. Start the service:"
echo "   sudo systemctl start face-recognition-api"
echo "   sudo systemctl enable face-recognition-api"
echo "4. Check status:"
echo "   sudo systemctl status face-recognition-api"
echo ""
echo "📖 See $APP_DIR/README_SETUP.txt for detailed instructions"
echo "================================================"

