# Quick Start Guide - EC2 Deployment

## 🚀 Fast Setup (5 minutes)

### 1. Launch EC2 Instance
- Instance: `t3.medium` or larger
- OS: Amazon Linux 2023 or Ubuntu 22.04
- Security Group: Allow ports 22, 80, 5001

### 2. Connect & Setup
```bash
# Connect to EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Upload setup script
scp -i your-key.pem setup-ec2.sh ec2-user@your-ec2-ip:~/

# Run setup (on EC2)
chmod +x setup-ec2.sh
sudo ./setup-ec2.sh
```

### 3. Upload Application
```bash
# From local machine
cd /Users/inky/Desktop/infineon-x/backend
tar -czf app.tar.gz api/ requirements.txt encodings.pkl
scp -i your-key.pem app.tar.gz ec2-user@your-ec2-ip:~/

# On EC2
ssh -i your-key.pem ec2-user@your-ec2-ip
cd /opt/face-recognition-api
sudo tar -xzf ~/app.tar.gz
sudo chown -R faceapi:faceapi /opt/face-recognition-api
```

### 4. Install Dependencies & Start
```bash
# Install Python packages
sudo -u faceapi /opt/face-recognition-api/venv/bin/pip install -r /opt/face-recognition-api/requirements.txt

# Start service
sudo systemctl start face-recognition-api
sudo systemctl enable face-recognition-api

# Check status
sudo systemctl status face-recognition-api
```

### 5. Test API
```bash
# On EC2
curl http://localhost:5001/health

# From local machine
curl http://your-ec2-ip:5001/health
```

## 📋 Common Commands

Use the helper script for easy management:

```bash
# Upload helper script to EC2
scp -i your-key.pem ec2-commands.sh ec2-user@your-ec2-ip:~/

# On EC2, make executable
chmod +x ec2-commands.sh

# Use commands
./ec2-commands.sh start      # Start API
./ec2-commands.sh stop       # Stop API
./ec2-commands.sh restart    # Restart API
./ec2-commands.sh logs       # View logs
./ec2-commands.sh test       # Test API
```

## 🔧 Manual Commands

```bash
# Service management
sudo systemctl start face-recognition-api
sudo systemctl stop face-recognition-api
sudo systemctl restart face-recognition-api
sudo systemctl status face-recognition-api

# View logs
sudo journalctl -u face-recognition-api -f
sudo tail -f /opt/face-recognition-api/logs/error.log

# Update application
sudo systemctl stop face-recognition-api
sudo cp -r ~/api/* /opt/face-recognition-api/api/
sudo chown -R faceapi:faceapi /opt/face-recognition-api/api
sudo systemctl start face-recognition-api
```

## 🌐 API Endpoints

Once running, access your API at:

- `http://your-ec2-ip:5001/` - API info
- `http://your-ec2-ip:5001/health` - Health check
- `http://your-ec2-ip:5001/recognize` - POST - Recognize faces
- `http://your-ec2-ip:5001/enroll` - POST - Enroll faces
- `http://your-ec2-ip:5001/train` - POST - Train model

## 📚 Full Documentation

See `EC2_SETUP.md` for detailed setup instructions and troubleshooting.

