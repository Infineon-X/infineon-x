# Procfile Troubleshooting Guide

## Error Message
```
detecting Procfile: invalid Procfile entry: expected name and command parts but got 1 parts
```

## Root Cause Analysis

The DigitalOcean buildpack is very strict about Procfile format. The error suggests it's not parsing the `name: command` format correctly.

## Solutions

### Solution 1: Simplified Procfile (Current)

I've simplified the Procfile to the minimal working version:

```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 api.app:app
```

**Test this first** - if it works, gradually add optimizations back.

### Solution 2: Set Run Command in Dashboard (Recommended)

**Bypass Procfile entirely** by setting the run command in DigitalOcean dashboard:

1. Go to **DigitalOcean App Platform Dashboard**
2. Select your app
3. Go to **Settings → Components**
4. Click on your **Web Service** component
5. Click **Edit**
6. In **Run Command**, enter:
   ```
   gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 api.app:app
   ```
7. Click **Save**
8. Redeploy

**Advantages:**
- ✅ No Procfile parsing issues
- ✅ Can be changed without code changes
- ✅ Easier to debug

### Solution 3: Check File Encoding

Ensure Procfile is:
- **UTF-8 encoded** (no BOM)
- **Unix line endings** (LF, not CRLF)
- **No trailing whitespace**
- **Exactly one space** after the colon

### Solution 4: Verify Procfile Location

Ensure Procfile is in the **root directory** that DigitalOcean is building from:
- If root directory is `backend/`, Procfile should be at `backend/Procfile`
- If root directory is repo root, Procfile should be at repo root

## Procfile Format Rules

✅ **Correct:**
```
web: gunicorn app:app
worker: python worker.py
```

❌ **Incorrect:**
```
web:gunicorn app:app          # No space after colon
web : gunicorn app:app        # Space before colon
web: gunicorn app:app         # Trailing space
                              # Empty line
```

## Testing Locally

You can test Procfile format locally:

```bash
# Install foreman (Procfile runner)
gem install foreman

# Test Procfile
foreman check

# Run locally
foreman start
```

## Current Status

✅ **Procfile simplified** - Removed optimization flags that might cause parsing issues
✅ **Format verified** - Correct `name: command` format
✅ **No trailing newline** - Clean file

## Next Steps

1. **Deploy with simplified Procfile** - Test if it works
2. **If it works**: Gradually add optimizations back one at a time
3. **If it fails**: Use Solution 2 (set run command in dashboard)

## Gradual Optimization Path

Once basic Procfile works, add optimizations one at a time:

**Step 1 (Basic - Current):**
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 api.app:app
```

**Step 2 (Add threads):**
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 api.app:app
```

**Step 3 (Add preload):**
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 --preload api.app:app
```

**Step 4 (Full optimization):**
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 --max-requests 1000 --max-requests-jitter 100 --preload api.app:app
```

Test each step before moving to the next.

