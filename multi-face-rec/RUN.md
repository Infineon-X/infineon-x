
Source perplexity: https://www.perplexity.ai/search/so-conclusion-is-to-use-face-r-zrNVn0loRnOjHSYm5hMcFg#13
## Simple Run Script

Create `run.sh` in your project root:

```bash
#!/bin/bash

echo "=========================================="
echo "Face Recognition - Orange Pi Runner"
echo "=========================================="

# Pull latest changes from GitHub
echo "📥 Pulling latest model from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed. Check your connection."
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

if [ $? -ne 0 ]; then
    echo "❌ Virtual environment activation failed."
    exit 1
fi

# Check if encodings.pkl exists
if [ ! -f "encodings.pkl" ]; then
    echo "❌ encodings.pkl not found. Please train the model first."
    exit 1
fi

echo "✅ Setup complete!"
echo ""
echo "Choose an option:"
echo "1) Run face recognition on test image"
echo "2) Run real-time camera recognition"
echo "3) Exit"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo "🔍 Running recognition on test images..."
        python3 recognize.py
        ;;
    2)
        echo "📹 Starting real-time camera recognition..."
        echo "Press 'q' to quit"
        python3 realtime_recognition.py
        ;;
    3)
        echo "👋 Exiting..."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"
```

## Quick Run Scripts

Create `quick_run.sh` for immediate recognition:

```bash
#!/bin/bash

# Quick run - pull, activate, and run recognition
git pull origin main
source venv/bin/activate
python3 recognize.py
```

Create `quick_realtime.sh` for camera:

```bash
#!/bin/bash

# Quick realtime - pull, activate, and run camera
git pull origin main
source venv/bin/activate
python3 realtime_recognition.py
```

## Update Only Script

Create `update.sh` to just pull the latest model:

```bash
#!/bin/bash

echo "🔄 Updating face recognition model..."
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Model updated successfully!"
    echo "📊 Latest commit:"
    git log -1 --pretty=format:"%h - %s (%ar)"
    echo ""
else
    echo "❌ Update failed!"
    exit 1
fi
```

## First-Time Setup Script

Create `setup_orangepi.sh` for initial Orange Pi setup:

```bash
#!/bin/bash

echo "=========================================="
echo "Face Recognition - Orange Pi Setup"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update

# Install dependencies
echo "📦 Installing system dependencies..."
sudo apt-get install -y build-essential cmake gfortran git wget curl \
    graphicsmagick libgraphicsmagick1-dev libatlas-base-dev \
    libavcodec-dev libavformat-dev libboost-all-dev libgtk2.0-dev \
    libjpeg-dev liblapack-dev libswscale-dev pkg-config \
    python3-dev python3-numpy python3-pip python3-venv zip

# Clone repository (if not already cloned)
if [ ! -d "face-recognition-project" ]; then
    echo "📥 Cloning repository..."
    read -p "Enter GitHub repo URL: " repo_url
    git clone $repo_url face-recognition-project
    cd face-recognition-project
else
    echo "📁 Project directory exists, entering..."
    cd face-recognition-project
fi

# Create virtual environment
echo "🔧 Creating virtual environment..."
python3.10 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install Python packages
echo "📦 Installing Python packages (this may take 15-20 hours on Orange Pi One)..."
pip install --upgrade pip
pip install -r requirements.txt

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x run.sh
chmod +x quick_run.sh
chmod +x quick_realtime.sh
chmod +x update.sh

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Usage:"
echo "  ./run.sh              - Interactive menu"
echo "  ./quick_run.sh        - Quick test image recognition"
echo "  ./quick_realtime.sh   - Quick camera recognition"
echo "  ./update.sh           - Update model only"
echo ""
```

## Make Scripts Executable

On your Mac, before pushing to GitHub:

```bash
chmod +x run.sh
chmod +x quick_run.sh
chmod +x quick_realtime.sh
chmod +x update.sh
chmod +x setup_orangepi.sh

git add *.sh
git commit -m "Add Orange Pi run scripts"
git push origin main
```

## On Orange Pi - First Time

```bash
# Clone your repo
git clone https://github.com/yourusername/face-recognition-project.git
cd face-recognition-project

# Run setup (only once)
bash setup_orangepi.sh
```

## On Orange Pi - Daily Use

```bash
# Option 1: Interactive menu
./run.sh

# Option 2: Quick run on test images
./quick_run.sh

# Option 3: Real-time camera
./quick_realtime.sh

# Option 4: Just update the model
./update.sh
```

## Workflow Summary

**On Mac (Training):**
1. Add new training images
2. Run `python3 train.py`
3. Commit and push:
```bash
git add encodings.pkl
git commit -m "Update model: added John's face"
git push origin main
```

**On Orange Pi (Inference):**
1. Run `./quick_run.sh` - automatically pulls latest model and runs
2. Or use `./run.sh` for menu options

That's it! Simple git pull + source venv + run in one command![1][2]

[1](https://www.reddit.com/r/raspberry_pi/comments/x7a1xp/simplest_way_of_deploying_a_python_application_to/)
[2](https://dzone.com/articles/deploying-machine-learning-models-iot-devices)