# EC2 Setup Tutorial for Face Recognition API

This guide will help you deploy the Face Recognition Flask API on an AWS EC2 instance.

## Prerequisites

- AWS account with EC2 access
- Basic knowledge of Linux commands
- SSH access to your EC2 instance

## Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose an instance type:
   - **Minimum**: `t3.medium` (2 vCPU, 4 GB RAM) - recommended for face recognition
   - **Better**: `t3.large` or `c5.xlarge` for better performance
3. Select Amazon Linux 2023 or Ubuntu 22.04 LTS
4. Configure security group:
   - **Inbound Rules**:
     - SSH (22) from your IP
     - HTTP (80) from anywhere (0.0.0.0/0)
     - Custom TCP (5001) from anywhere (0.0.0.0/0) - for Flask app
5. Launch instance and download key pair (.pem file)
6. Set correct permissions: `chmod 400 your-key.pem`

## Step 2: Connect to EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip-address
# For Ubuntu, use: ssh -i your-key.pem ubuntu@your-ec2-ip-address
```

## Step 3: Run Setup Script

### Option A: Upload and Run Script Locally

1. Upload the setup script to your EC2 instance:
```bash
scp -i your-key.pem setup-ec2.sh ec2-user@your-ec2-ip-address:~/
```

2. SSH into your instance and run:
```bash
chmod +x setup-ec2.sh
sudo ./setup-ec2.sh
```

### Option B: Download Script Directly on EC2

```bash
# Download the script (if hosted on GitHub or similar)
curl -O https://your-repo-url/setup-ec2.sh
chmod +x setup-ec2.sh
sudo ./setup-ec2.sh
```

## Step 4: Upload Application Files

From your local machine, upload the application:

```bash
# Create a tarball of your application
cd /Users/inky/Desktop/infineon-x/backend
tar -czf app.tar.gz api/ requirements.txt encodings.pkl

# Upload to EC2
scp -i your-key.pem app.tar.gz ec2-user@your-ec2-ip-address:~/

# SSH into EC2 and extract
ssh -i your-key.pem ec2-user@your-ec2-ip-address
cd /opt/face-recognition-api
sudo tar -xzf ~/app.tar.gz
sudo chown -R faceapi:faceapi /opt/face-recognition-api
```

## Step 5: Start the Service

```bash
sudo systemctl start face-recognition-api
sudo systemctl enable face-recognition-api
sudo systemctl status face-recognition-api
```

## Step 6: Verify Installation

Check if the API is running:

```bash
curl http://localhost:5001/health
```

Or from your local machine:

```bash
curl http://your-ec2-ip-address:5001/health
```

## Step 7: Configure Firewall (if needed)

The setup script configures the firewall, but verify:

```bash
# For Amazon Linux 2023
sudo firewall-cmd --list-all

# For Ubuntu
sudo ufw status
```

## Optional: Set Up Nginx Reverse Proxy

For production, it's recommended to use Nginx as a reverse proxy:

1. Install Nginx:
```bash
sudo yum install nginx -y  # Amazon Linux
# or
sudo apt-get install nginx -y  # Ubuntu
```

2. Create Nginx configuration:
```bash
sudo nano /etc/nginx/conf.d/face-api.conf
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your EC2 IP

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for face recognition processing
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }
}
```

3. Start Nginx:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo nginx -t  # Test configuration
```

## Troubleshooting

### Check Service Logs

```bash
sudo journalctl -u face-recognition-api -f
```

### Check Application Logs

```bash
sudo tail -f /opt/face-recognition-api/logs/app.log
```

### Restart Service

```bash
sudo systemctl restart face-recognition-api
```

### Check Port Status

```bash
sudo netstat -tlnp | grep 5001
# or
sudo ss -tlnp | grep 5001
```

### Common Issues

1. **Port already in use**: Change port in `api/app.py` or stop conflicting service
2. **Permission denied**: Ensure `/opt/face-recognition-api` is owned by `faceapi` user
3. **Module not found**: Run `sudo -u faceapi /opt/face-recognition-api/venv/bin/pip install -r /opt/face-recognition-api/requirements.txt`
4. **Face recognition errors**: Ensure all system dependencies are installed (handled by setup script)

## Security Recommendations

1. **Use HTTPS**: Set up SSL certificate with Let's Encrypt
2. **Restrict Access**: Update security group to allow only specific IPs
3. **Use Environment Variables**: Store sensitive data in environment variables
4. **Regular Updates**: Keep system and packages updated
5. **Monitor Logs**: Set up CloudWatch or similar monitoring

## Maintenance

### Update Application

```bash
# Upload new version
scp -i your-key.pem -r api/ ec2-user@your-ec2-ip-address:~/

# On EC2
sudo systemctl stop face-recognition-api
sudo cp -r ~/api/* /opt/face-recognition-api/api/
sudo systemctl start face-recognition-api
```

### Update Python Packages

```bash
sudo -u faceapi /opt/face-recognition-api/venv/bin/pip install -r /opt/face-recognition-api/requirements.txt --upgrade
sudo systemctl restart face-recognition-api
```

## API Endpoints

Once running, your API will be available at:

- `http://your-ec2-ip:5001/` - API info
- `http://your-ec2-ip:5001/health` - Health check
- `http://your-ec2-ip:5001/recognize` - POST - Recognize faces
- `http://your-ec2-ip:5001/enroll` - POST - Enroll face images
- `http://your-ec2-ip:5001/train` - POST - Train model

## Cost Optimization

- Use EC2 Spot Instances for non-critical workloads
- Stop instance when not in use (for development)
- Use smaller instance types if processing is infrequent
- Consider AWS Lambda for serverless deployment (requires refactoring)

