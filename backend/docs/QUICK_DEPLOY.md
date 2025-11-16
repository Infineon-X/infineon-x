# Quick Deploy Guide: DigitalOcean App Platform

## TL;DR: Buildpack vs Docker

**For this face-recognition Flask app: Use Docker** ✅

**Why?**
- `face-recognition` requires complex system dependencies (`dlib`, `cmake`, etc.)
- Docker ensures these dependencies install correctly
- More reliable than buildpack for native libraries

**Buildpack is fine if:**
- You want fastest setup
- You're okay troubleshooting build issues
- You add `Aptfile` for system dependencies

---

## Option 1: Buildpack (Simpler, Faster)

### Files Created:
- ✅ `runtime.txt` - Python 3.10.15
- ✅ `Procfile` - Gunicorn command
- ✅ `Aptfile` - System dependencies

### Deploy Steps:
1. Push to GitHub
2. Create App on DigitalOcean App Platform
3. Connect GitHub repo
4. Set root directory: `backend/`
5. Run command (auto-detected from Procfile):
   ```
   gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 api.app:app
   ```
6. Deploy!

---

## Option 2: Docker (Recommended)

### Files Created:
- ✅ `Dockerfile` - Optimized for DigitalOcean
- ✅ `.dockerignore` - Excludes unnecessary files

### Deploy Steps:
1. Push to GitHub (with Dockerfile)
2. Create App on DigitalOcean App Platform
3. Connect GitHub repo
4. Set root directory: `backend/`
5. Dockerfile auto-detected
6. Port: `8080` (or use `$PORT`)
7. Deploy!

---

## Key Differences

| Feature | Buildpack | Docker |
|---------|-----------|--------|
| Setup Time | ⚡ Fastest | ⚡ Fast |
| Reliability | ⚠️ May fail with native libs | ✅ Guaranteed |
| Control | ⚠️ Limited | ✅ Full control |
| Debugging | ⚠️ Harder | ✅ Easy (test locally) |
| Best For | Simple Python apps | Complex dependencies |

---

## Cost
Both options: **$5/month** (Basic plan) or **$12/month** (Pro plan)

---

## Next Steps

1. **Choose your approach** (Docker recommended)
2. **Push files to GitHub**
3. **Deploy on DigitalOcean App Platform**
4. **Monitor logs** if build fails

See `DEPLOYMENT.md` for detailed instructions.

