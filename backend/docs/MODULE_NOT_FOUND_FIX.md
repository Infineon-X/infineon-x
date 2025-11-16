# Module Not Found Fix: api.app

## Problem
```
Application module not found
Reason: The deployment failed because Gunicorn couldn't find the specified application module 'api.app'.
```

## Root Cause
The `api/` directory was missing `__init__.py`, which means Python doesn't recognize it as a package.

## Solution Applied

### ✅ Created `api/__init__.py`
Created an empty `__init__.py` file in the `api/` directory to make it a proper Python package.

**File**: `backend/api/__init__.py`
```python
# This file makes the api directory a Python package
```

## Verification

### File Structure (Correct)
```
backend/
├── api/
│   ├── __init__.py    # ✅ NEW - Makes api a package
│   └── app.py         # Contains: app = Flask(__name__)
├── Procfile
├── requirements.txt
└── ...
```

### Procfile (Correct)
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 api.app:app
```

The module path `api.app:app` means:
- `api` - the package (directory with `__init__.py`)
- `app` - the module (`app.py`)
- `:app` - the Flask instance variable (`app = Flask(__name__)`)

## Additional Checks

### 1. Verify Working Directory
DigitalOcean buildpack should set the working directory to where your `requirements.txt` is located (i.e., `backend/`).

If you set the root directory in App Platform to `backend/`, the working directory will be `/app` (or similar), and `api.app:app` should work.

### 2. If Module Still Not Found

**Option A: Use absolute import path**
If the working directory is different, you might need to adjust the Procfile:

```
web: cd /app && gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 api.app:app
```

**Option B: Set PYTHONPATH**
Add to environment variables in App Platform:
```
PYTHONPATH=/app
```

**Option C: Move app.py to root**
If nothing else works, you could move `app.py` to the backend root and change Procfile to:
```
web: gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app
```

But this is NOT recommended as it changes your project structure.

## Testing Locally

Test the import locally (in virtual environment):

```bash
cd backend
source .venv/bin/activate  # or your venv
python -c "from api.app import app; print('✅ Success')"
```

If this works, the deployment should work too.

## Next Steps

1. ✅ **Created `api/__init__.py`** - Done
2. **Commit and push:**
   ```bash
   git add api/__init__.py
   git commit -m "Add __init__.py to make api a Python package"
   git push
   ```
3. **Redeploy** on DigitalOcean
4. **Check logs** - Should see successful startup

## Expected Result

After deployment, you should see in logs:
- ✅ "Booting worker with pid: X"
- ✅ "Listening at: http://0.0.0.0:XXXX"
- ✅ No "ModuleNotFoundError" or "No module named 'api'"

## Troubleshooting

### If still getting "ModuleNotFoundError: No module named 'api'"

1. **Check root directory** in App Platform settings - should be `backend/`
2. **Check working directory** in build logs - should contain `api/` directory
3. **Add PYTHONPATH** environment variable: `/app` (or your working directory)
4. **Check file structure** - ensure `api/__init__.py` exists

### If getting "ModuleNotFoundError: No module named 'flask'"

This means dependencies aren't installed. Check:
- `requirements.txt` exists and contains Flask
- Build logs show successful pip install
- No build errors during dependency installation

