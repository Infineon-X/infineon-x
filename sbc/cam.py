#!/usr/bin/env python3
"""
Simple test script for Raspberry Pi 4B flex camera
Usage: python cam.py [output_filename.jpg]
"""

import time
import sys
import os
import subprocess

# Try to import picamera2 (for newer Raspberry Pi OS with libcamera)
try:
    from picamera2 import Picamera2
    PICAMERA2_AVAILABLE = True
except ImportError:
    PICAMERA2_AVAILABLE = False

# Check if we're in a venv
IN_VENV = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)

# Try to find system Python (for picamera2 when running in venv)
SYSTEM_PYTHON = None
if IN_VENV and not PICAMERA2_AVAILABLE:
    # Try common system Python paths
    for python_path in ['/usr/bin/python3', '/usr/bin/python3.11', '/usr/bin/python3.12', '/usr/bin/python3.13']:
        if os.path.exists(python_path):
            # Test if this Python has picamera2
            try:
                result = subprocess.run(
                    [python_path, '-c', 'from picamera2 import Picamera2'],
                    capture_output=True,
                    timeout=2
                )
                if result.returncode == 0:
                    SYSTEM_PYTHON = python_path
                    break
            except:
                pass

def capture_photo(output_path):
    """Capture a photo using picamera2"""
    capture_success = False
    
    # Try to capture using picamera2 directly
    if PICAMERA2_AVAILABLE:
        try:
            print("📷 Using picamera2 (libcamera)...")
            picam2 = Picamera2()
            config = picam2.create_still_configuration()
            picam2.configure(config)
            picam2.start()
            time.sleep(1.0)  # Let camera warm up
            picam2.capture_file(output_path)
            picam2.stop()
            print(f"✅ Photo saved to: {output_path}")
            capture_success = True
        except Exception as e:
            print(f"⚠️ picamera2 failed: {e}")
            if SYSTEM_PYTHON:
                print("🔄 Falling back to system Python with picamera2...")
    
    # Fallback: Try using system Python for picamera2 if we're in venv
    if not capture_success and SYSTEM_PYTHON:
        try:
            print("📷 Using picamera2 via system Python...")
            # Create a temporary Python script to capture with picamera2
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as script_file:
                script_content = '''#!/usr/bin/env python3
from picamera2 import Picamera2
import time
import sys

picam2 = Picamera2()
config = picam2.create_still_configuration()
picam2.configure(config)
picam2.start()
time.sleep(1.0)
picam2.capture_file(sys.argv[1])
picam2.stop()
'''
                script_file.write(script_content)
                script_path = script_file.name
            
            # Make script executable
            os.chmod(script_path, 0o755)
            
            # Run the script with system Python
            result = subprocess.run(
                [SYSTEM_PYTHON, script_path, output_path],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            # Clean up temp script
            try:
                os.unlink(script_path)
            except:
                pass
            
            if result.returncode == 0:
                print(f"✅ Photo saved to: {output_path}")
                capture_success = True
            else:
                print(f"❌ Failed to capture photo: {result.stderr}")
        except Exception as e:
            print(f"❌ System Python fallback failed: {e}")
    
    if not capture_success:
        print("\n❌ Failed to capture photo")
        print("\nTroubleshooting:")
        if not PICAMERA2_AVAILABLE and not SYSTEM_PYTHON:
            print("  - Install picamera2: sudo apt install python3-picamera2")
        print("  - Make sure camera is connected and enabled")
        print("  - Check camera permissions")
        sys.exit(1)

if __name__ == "__main__":
    # Get output filename from command line or use default
    if len(sys.argv) > 1:
        output_path = sys.argv[1]
    else:
        from datetime import datetime
        output_path = f"test_capture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    
    print("="*50)
    print("📷 Raspberry Pi Camera Test")
    print("="*50)
    print(f"Output file: {output_path}")
    print()
    
    capture_photo(output_path)
