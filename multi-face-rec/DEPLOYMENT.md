# Face Recognition API - Deployment Guide

## Overview
This face recognition system consists of:
- **API Server** (`api/app.py`) - Flask REST API for face recognition
- **Client** (`client/orangepi_client.py`) - Python client for capturing and sending images

## Quick Start

### 1. Run API Server Locally
```bash
# Activate virtual environment
source venv/bin/activate

# Run Flask API
python api/app.py
```
The API will run on `http://localhost:5000`

### 2. Test with Client
```bash
# Run client (will use localhost by default)
python client/orangepi_client.py

# Or set custom API URL
export API_URL="http://your-server:5000/recognize"
python client/orangepi_client.py
```

## API Endpoints

### `GET /`
Get API information and available endpoints

### `GET /health`
Check API health and view loaded faces
```bash
curl http://localhost:5000/health
```

### `POST /recognize`
Recognize faces in an image
- Content-Type: `multipart/form-data`
- Field name: `image`

```bash
curl -X POST http://localhost:5000/recognize \
  -F "image=@path/to/image.jpg"
```

## Environment Variables

### Client
- `API_URL` - API endpoint (default: `http://localhost:5000/recognize`)

### Server
- `PORT` - Server port (default: `5000`)

## Docker Deployment

```bash
# Build image
docker build -t face-recognition-api .

# Run container
docker run -p 5000:5000 face-recognition-api
```

## Cloud Deployment Options

### Railway
1. Connect your GitHub repo
2. Set root directory to `/`
3. Start command: `python api/app.py`
4. Add `encodings.pkl` to your repo

### Fly.io
```bash
fly launch
fly deploy
```

### Other Platforms
The API is a standard Flask app and can be deployed to:
- Heroku
- DigitalOcean App Platform
- AWS Elastic Beanstalk
- Google Cloud Run

## Client Usage

### Single Capture
```bash
python client/orangepi_client.py
```

### Continuous Monitoring
```bash
# Every 5 seconds
python client/orangepi_client.py continuous 5

# Every 30 seconds
python client/orangepi_client.py continuous 30
```

### Check API Health
```bash
python client/orangepi_client.py health
```

### Interactive Menu (Bash Script)
```bash
./client/capture.sh
```

## Notes
- Ensure `encodings.pkl` exists before running the API
- Client requires OpenCV and camera access
- API uses face_recognition library (requires dlib)

