# Docker Build Fix

## Problem
Docker build failed with error:
```
ERROR: Error [Errno 2] No such file or directory: 'git' while executing command git version
ERROR: Cannot find command 'git' - do you have 'git' installed and in your PATH?
```

## Root Cause
The `requirements.txt` file includes a dependency installed from Git:
```
face-recognition-models @ git+https://github.com/ageitgey/face_recognition_models
```

But the Dockerfile didn't install `git`, which is required to clone Git repositories.

## Fixes Applied

### ✅ 1. Added `git` to System Dependencies
```dockerfile
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \                    # ✅ Added
    libopenblas-dev \
    ...
```

### ✅ 2. Upgraded pip Before Installing Requirements
```dockerfile
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt
```

### ✅ 3. Fixed libgl1 Package Name
Changed from `libgl1` to `libgl1-mesa-glx` (correct package name)

### ✅ 4. Added DigitalOcean-Required Flags
```dockerfile
CMD gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120 api.app:app
```

### ✅ 5. Fixed Health Check
Changed from `requests` (not installed) to `urllib` (standard library):
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8080}/health').read()" || exit 1
```

### ✅ 6. Recreated `api/__init__.py`
Required for Python to recognize `api` as a package.

## Updated Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libopenblas-dev \
    liblapack-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose port (DigitalOcean will assign PORT env variable)
EXPOSE 8080

# Health check (using urllib from standard library)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8080}/health').read()" || exit 1

# Run the Flask app with DigitalOcean-required worker-tmp-dir flag
CMD gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120 api.app:app
```

## Changes Summary

| Item | Before | After |
|------|--------|-------|
| Git | ❌ Missing | ✅ Installed |
| pip upgrade | ❌ Not upgraded | ✅ Upgraded first |
| libgl1 | ❌ Wrong package | ✅ libgl1-mesa-glx |
| worker-tmp-dir | ❌ Missing | ✅ Added |
| Health check | ❌ Uses requests | ✅ Uses urllib |
| api/__init__.py | ❌ Missing | ✅ Created |

## Testing Locally

Test the Docker build locally:

```bash
cd backend
docker build -t face-recognition-api .
docker run -p 8080:8080 -e PORT=8080 face-recognition-api
```

Then test:
```bash
curl http://localhost:8080/health
```

## Next Steps

1. **Commit changes:**
   ```bash
   git add Dockerfile api/__init__.py
   git commit -m "Fix Dockerfile: add git, upgrade pip, fix health check"
   git push
   ```

2. **Redeploy on DigitalOcean** - Build should now succeed

3. **Monitor build logs** - Should see:
   - ✅ Git installed successfully
   - ✅ pip upgraded
   - ✅ face-recognition-models cloned from Git
   - ✅ All dependencies installed
   - ✅ Build completes successfully

## Expected Build Time

- System dependencies: ~1-2 minutes
- Python dependencies: ~5-8 minutes (dlib compilation)
- **Total**: ~6-10 minutes

## Troubleshooting

### If build still fails:

1. **Check build logs** for specific errors
2. **Verify git is installed** - Should see in apt-get output
3. **Check pip upgrade** - Should see "Successfully upgraded pip"
4. **Verify requirements.txt** - Ensure all dependencies are valid

### If health check fails:

The health check uses `/health` endpoint. Ensure:
- Flask app has `/health` route
- Endpoint returns 200 status code
- No authentication required

### If module import fails:

Ensure `api/__init__.py` exists and Dockerfile copies all files correctly.

