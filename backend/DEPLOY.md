# Deployment Guide

## EC2 Deployment

### Prerequisites
- EC2 instance (Ubuntu 22.04 LTS recommended)
- Security group with port 8080 open
- SSH access to instance

### Steps

1. **Connect to EC2**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

2. **Install dependencies**
```bash
sudo apt update
sudo apt install -y python3-pip python3-venv git
sudo apt install -y build-essential cmake libopenblas-dev liblapack-dev libgl1 libglib2.0-0
```

3. **Clone and setup**
```bash
git clone <your-repo-url>
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. **Run with Gunicorn**
```bash
gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 120 api.app:app
```

5. **Run as service (optional)**
```bash
sudo nano /etc/systemd/system/face-api.service
```

Add:
```ini
[Unit]
Description=Face Recognition API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/backend
Environment="PATH=/home/ubuntu/backend/venv/bin"
ExecStart=/home/ubuntu/backend/venv/bin/gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 120 api.app:app

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable face-api
sudo systemctl start face-api
```

## Digital Ocean Droplet

### First Time Deployment
```bash
# SSH into droplet
ssh user@your-droplet-ip

# Run deployment script (uses default repo, or pass custom URL)
bash deploy.sh
# Or: bash deploy.sh https://github.com/infineon-x/infineon-x.git
```

### Update Deployment (After Code Changes)
```bash
# SSH into droplet
ssh user@your-droplet-ip

# Run update script (pulls latest code and restarts)
bash /opt/face-api/backend/update.sh
```

Or manually:
```bash
cd /opt/face-api
git pull
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart face-api
```

