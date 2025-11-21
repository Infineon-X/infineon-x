# Infinite Running Commands for Orange Pi / Raspberry Pi

## Camera Setup for Raspberry Pi 4

### Important Note for Raspberry Pi OS Bullseye and Later

If you don't see the "Camera" option in `raspi-config` on your Raspberry Pi 4, **this is normal**. Newer Raspberry Pi OS versions (Bullseye and later) have removed the legacy camera stack and its config menu option. The new camera driver uses `libcamera` instead of the older `raspicam` stack, and enabling the camera is no longer handled via `raspi-config`.

### What To Do

- **You do NOT need to enable the camera in `raspi-config` anymore.** The interface is now enabled by default.
- Simply connect your camera, boot, and use `libcamera-*` commands.

### To Test Your Camera

1. Connect your OV5647/P5V04A camera as described before.

2. Boot your Pi, open Terminal, and run:

   - `libcamera-hello` (test stream)
   - `libcamera-still -o image.jpg` (capture image)
   - `libcamera-vid -t 10000 -o video.h264` (record 10s video)

3. If you get errors, run `dmesg | grep camera` for hardware detection, or check the ribbon cable connection.

### Troubleshooting

- **Camera not detected**: Ensure the ribbon cable is connected with metal contacts facing the correct way.
- **I2C requirement**: Use `raspi-config` to enable "I2C" only if your camera breakout requires it (most don't for standard Pi camera module).
- **OS updates**: Make sure your OS is updated:
  ```bash
  sudo apt update && sudo apt upgrade && sudo reboot
  ```

If you encounter errors when running `libcamera-hello`, check:
- Ribbon cable connection (metal contacts facing the correct direction)
- Camera module compatibility with your Pi model
- System logs: `dmesg | grep camera`

### Python Camera Library Support

The `rpi.py` script automatically detects and uses the best available camera library:

1. **picamera2** (recommended for Raspberry Pi OS Bullseye+): Uses `libcamera` directly
   - Install: `sudo apt install python3-picamera2`
   - **Important**: Must be installed system-wide (not in virtual environment)
   - Automatically used if available

2. **OpenCV** (fallback): Uses V4L2 interface
   - Already included in `requirements.txt`
   - Used if `picamera2` is not available

The script will try `picamera2` first, then fall back to OpenCV if needed. This ensures compatibility with both newer and older Raspberry Pi OS versions.

### Troubleshooting Camera Issues

If you see "❌ couldn't grab an image from the camera":

1. **Check camera library status**:
   ```bash
   python3 rpi.py camera-status
   ```

2. **Install picamera2** (if not installed):
   ```bash
   sudo apt install python3-picamera2
   ```
   **Note**: If you're using a virtual environment, picamera2 must be installed system-wide. You may need to run the script outside the venv or install it system-wide.

3. **Test camera with libcamera**:
   ```bash
   libcamera-hello
   libcamera-still -o test.jpg
   ```

4. **Check camera detection**:
   ```bash
   dmesg | grep camera
   ```

5. **If using virtual environment**: Try running outside venv:
   ```bash
   deactivate  # exit venv
   python3 rpi.py
   ```

---

## Installation

1. Run the setup script:
```bash
./setup-rpi.sh
```

This will install all dependencies including `picamera2` for newer Raspberry Pi OS versions.

---

## Option 1: Simple Bash Script (Recommended for testing)

Run the script directly:
```bash
./run_continuous.sh [interval]
```

Example (capture every 5 seconds):
```bash
./run_continuous.sh 5
```

The script will:
- Auto-restart if the client crashes
- Log timestamps
- Run until you press Ctrl+C

## Option 2: Systemd Service (Recommended for production)

1. Edit the service file and update paths if needed:
```bash
nano orangepi-client.service
```

2. Copy service file to systemd directory:
```bash
sudo cp orangepi-client.service /etc/systemd/system/
```

3. Reload systemd and enable service:
```bash
sudo systemd daemon-reload
sudo systemctl enable orangepi-client.service
```

4. Start the service:
```bash
sudo systemctl start orangepi-client.service
```

5. Check status:
```bash
sudo systemctl status orangepi-client.service
```

6. View logs:
```bash
sudo journalctl -u orangepi-client.service -f
```

7. Stop the service:
```bash
sudo systemctl stop orangepi-client.service
```

## Option 3: Direct Python Command (Manual)

Run directly with Python:
```bash
python3 orangepi_client.py continuous 5
```

## Option 4: Using nohup (Background)

Run in background and log to file:
```bash
nohup python3 orangepi_client.py continuous 5 > client.log 2>&1 &
```

View logs:
```bash
tail -f client.log
```

Stop:
```bash
pkill -f orangepi_client.py
```

