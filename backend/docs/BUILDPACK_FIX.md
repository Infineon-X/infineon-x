# Buildpack CMake Fix for dlib

## Problem
CMake can't find its modules directory when building `dlib`:
```
CMake Error: Could not find CMAKE_ROOT !!!
Modules directory not found in /layers/digitalocean_apt/apt/usr/share/cmake-3.22
```

## Solution Applied

### 1. Updated Aptfile
Added `cmake-data` package which contains CMake modules:
```
cmake
cmake-data  # <-- Added this
libopenblas-dev
...
```

### 2. Replaced runtime.txt with .python-version
As per buildpack warning, using `.python-version` instead:
```
3.10
```

### 3. Added pre_compile script
Created `bin/pre_compile` to set CMAKE_ROOT environment variable during build.

## Files Changed

1. ✅ `Aptfile` - Added `cmake-data` and additional dependencies
2. ✅ `.python-version` - Replaced deprecated `runtime.txt`
3. ✅ `bin/pre_compile` - Sets CMAKE_ROOT during build

## Next Steps

1. Commit and push these changes:
```bash
cd backend
git add Aptfile .python-version bin/pre_compile
git commit -m "Fix CMake configuration for dlib build"
git push
```

2. Redeploy on DigitalOcean App Platform

3. Monitor build logs to verify CMake finds its modules

## Alternative: If build still fails

If the build still fails, consider:

1. **Increase build timeout** in App Platform settings (dlib compilation takes time)

2. **Use pre-built dlib wheel** (if available):
   - Check if there's a pre-built wheel for your Python version
   - Modify requirements.txt to use wheel URL

3. **Switch to Docker** (most reliable):
   - Docker ensures CMake is properly configured
   - More control over build environment

## Verification

After deployment, check build logs for:
- ✅ "CMake found: version X.X.X"
- ✅ "CMAKE_ROOT set to: /layers/..."
- ✅ Successful dlib wheel build

