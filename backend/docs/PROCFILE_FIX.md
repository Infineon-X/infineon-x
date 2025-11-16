# Procfile Format Fix

## Issue
DigitalOcean buildpack reported: "invalid Procfile entry: expected name and command parts but got 1 parts"

## Root Cause
The buildpack is very strict about Procfile format. Even though the format looked correct, there may have been:
- Hidden characters
- Encoding issues
- Trailing whitespace
- Line ending issues

## Solution Applied

### Step 1: Simplified Procfile (Working Version)
Created a minimal Procfile that definitely works:
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 api.app:app
```

### Step 2: Gradually Add Optimizations
Once the basic version works, you can add optimizations back:

**Version 2 (Add threads):**
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 api.app:app
```

**Version 3 (Add preload):**
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 --preload api.app:app
```

**Version 4 (Full optimization):**
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 --max-requests 1000 --max-requests-jitter 100 --preload api.app:app
```

## Procfile Format Rules

1. **Format**: `process_name: command`
2. **No trailing spaces** after the command
3. **No empty lines** in the file
4. **UTF-8 encoding** (no special characters)
5. **Unix line endings** (LF, not CRLF)

## Verification

After deploying, check logs for:
- ✅ "detecting Procfile: web"
- ✅ No "invalid Procfile" errors
- ✅ App starts successfully

## Alternative: Set Run Command in Dashboard

If Procfile continues to cause issues, you can set the run command directly in DigitalOcean App Platform:

1. Go to **Settings → Components**
2. Select your **Web Service**
3. Click **Edit**
4. Set **Run Command** to:
   ```
   gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 api.app:app
   ```
5. Save and redeploy

This bypasses the Procfile entirely.

