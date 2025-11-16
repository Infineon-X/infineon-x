# DigitalOcean Deployment Guide

## Buildpack vs Docker: Which is Better?

### Buildpack Approach (Simpler, Faster Setup)

**Pros:**
- ✅ Zero-config deployment - just push to GitHub
- ✅ Automatic Python detection via `requirements.txt`
- ✅ Built-in HTTPS, auto-scaling, and CI/CD
- ✅ No Docker knowledge required
- ✅ Faster initial setup

**Cons:**
- ⚠️ Less control over system dependencies
- ⚠️ May struggle with complex native libraries (like `face-recognition`)
- ⚠️ Buildpack version limitations
- ⚠️ Harder to debug build issues

### Docker Approach (More Reliable for Complex Dependencies)

**Pros:**
- ✅ Full control over system dependencies
- ✅ Guaranteed reproducible builds
- ✅ Better for apps with native libraries (`dlib`, `cmake`, etc.)
- ✅ Easier to debug locally
- ✅ Can test exact production environment

**Cons:**
- ⚠️ Requires Docker knowledge
- ⚠️ Slightly more setup time
- ⚠️ Need to maintain Dockerfile

## Recommendation

**For this face-recognition Flask app: Use Docker** because:
1. `face-recognition` requires system libraries (`dlib`, `cmake`, `libopenblas-dev`)
2. Buildpacks may fail to install these dependencies correctly
3. Docker ensures consistent environment across dev/staging/prod

However, **buildpacks are fine** if:
- You want the fastest deployment
- You're okay troubleshooting build issues
- You can add `Aptfile` for system dependencies

---

## Option 1: Buildpack Deployment (Simpler)

### Setup Files

Create these files in `backend/` directory:

**1. `runtime.txt`** - Specify Python version
```
python-3.10.15
```

**2. `Procfile`** (optional, but recommended)
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 api.app:app
```

**3. `Aptfile`** - System dependencies for face-recognition
```
cmake
libopenblas-dev
liblapack-dev
libgl1-mesa-glx
libglib2.0-0
build-essential
```

### Deployment Steps

1. **Push to GitHub** (ensure `backend/` is root or configure root directory)
2. **Create App on DigitalOcean App Platform**
   - Connect GitHub repository
   - Set root directory to `backend/` (if repo root is project root)
   - Auto-detect will find Python buildpack
3. **Configure Run Command**:
   ```
   gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 api.app:app
   ```
4. **Set Environment Variables** (if needed):
   - `PORT` (auto-set by DigitalOcean)
   - Any other env vars your app needs
5. **Deploy**

### Potential Issues with Buildpack

- Build may fail if `Aptfile` dependencies aren't installed correctly
- `face-recognition` compilation may timeout
- May need to increase build timeout in App Platform settings

---

## Option 2: Docker Deployment (Recommended)

### Setup Files

**1. `Dockerfile`** (already exists in docs, but here's optimized version):

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
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

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')" || exit 1

# Run the Flask app
CMD gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120 api.app:app
```

**2. `.dockerignore`**:
```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
.git
.gitignore
README.md
.env
*.pkl
temp_enrollments/
```

### Deployment Steps

1. **Push to GitHub** with Dockerfile in `backend/` directory
2. **Create App on DigitalOcean App Platform**
   - Connect GitHub repository
   - Set root directory to `backend/`
   - App Platform will detect Dockerfile automatically
3. **Configure**:
   - Port: `8080` (or use `$PORT` env var)
   - Health check: `/health` endpoint
4. **Set Environment Variables**:
   - `PORT=8080` (if not using default)
5. **Deploy**

### Advantages of Docker Approach

- ✅ Guaranteed to work (same as local Docker build)
- ✅ Faster builds (cached layers)
- ✅ Easier debugging (test locally with Docker)
- ✅ More control over dependencies

---

## App Platform Configuration

### Recommended Settings

**Basic Plan:**
- **Instance Size**: Basic ($5/month) - 512MB RAM, 1 vCPU
- **Scaling**: Manual (1 instance) or Auto (1-3 instances)

**Pro Plan** (if you need more resources):
- **Instance Size**: Professional ($12/month) - 1GB RAM, 1 vCPU
- **Scaling**: Auto-scaling based on CPU/memory

### Environment Variables

Set these in App Platform Settings → Environment Variables:

```
PORT=8080
FLASK_ENV=production
```

### Health Checks

App Platform will use `/health` endpoint automatically if configured.

---

## Cost Comparison

**Buildpack:**
- Basic: $5/month (512MB RAM)
- Pro: $12/month (1GB RAM)

**Docker:**
- Same pricing as buildpack
- No additional cost

---

## Performance Optimization

### For Buildpack:
- Use `Procfile` to specify worker count
- Set appropriate timeout values
- Monitor build logs for dependency issues

### For Docker:
- Use multi-stage builds (optional, for smaller images)
- Cache pip dependencies
- Use `.dockerignore` to reduce build context

---

## Troubleshooting

### Buildpack Issues:

**Problem**: Build fails with `dlib` compilation errors
**Solution**: 
- Ensure `Aptfile` includes all dependencies
- Increase build timeout in App Platform settings
- Consider switching to Docker

**Problem**: App crashes on startup
**Solution**:
- Check run command includes `--worker-tmp-dir /dev/shm`
- Verify `api.app:app` matches your Flask app structure
- Check logs in App Platform dashboard

### Docker Issues:

**Problem**: Image too large
**Solution**: Use multi-stage build or `python:3.10-slim` base image

**Problem**: Build timeout
**Solution**: 
- Optimize Dockerfile layers
- Use build cache
- Consider using pre-built wheels for `face-recognition`

---

## Final Recommendation

**Use Docker** for this project because:
1. Face-recognition has complex native dependencies
2. More reliable and reproducible
3. Easier to debug locally
4. Better long-term maintainability

**Use Buildpack** if:
- You want fastest initial deployment
- You're okay with potential build troubleshooting
- You can add `Aptfile` for system dependencies

---

## Quick Start Commands

### Buildpack Deployment:
```bash
cd backend
# Create runtime.txt
echo "python-3.10.15" > runtime.txt
# Create Procfile
echo "web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:\$PORT --workers 2 --timeout 120 api.app:app" > Procfile
# Create Aptfile
cat > Aptfile << EOF
cmake
libopenblas-dev
liblapack-dev
libgl1-mesa-glx
libglib2.0-0
build-essential
EOF
git add runtime.txt Procfile Aptfile
git commit -m "Add DigitalOcean buildpack config"
git push
```

### Docker Deployment:
```bash
cd backend
# Dockerfile already exists in docs/Dockerfile.md
# Copy it to backend/Dockerfile
cp docs/Dockerfile.md Dockerfile  # Adjust as needed
git add Dockerfile .dockerignore
git commit -m "Add Dockerfile for DigitalOcean"
git push
```

---

## References

- [DigitalOcean Python Buildpack Docs](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/python/)
- [DigitalOcean Docker Deployment](https://docs.digitalocean.com/products/app-platform/how-to/use-dockerfile/)
- [Flask on App Platform Sample](https://github.com/digitalocean/sample-flask)

