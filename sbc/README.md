# Raspberry Pi Client (`sbc/`)

Python client for capturing an image from the Pi camera, sending it to the backend API, speaking recognized names via `edge-tts`, and updating status/results endpoints.

The main entrypoint is:

```bash
python3 sbc/rpi.py
```

## 1. Setup on the Pi

From the repo root on your Raspberry Pi:

```bash
cd /home/pi/infineon-x
python3 -m venv sbc/venv
source sbc/venv/bin/activate
pip install --upgrade pip
pip install -r sbc/requirements.txt
```

Configure your environment (backend URL, TTS, etc.) using a `.env` file in `sbc/`:

```bash
cd sbc
cat > .env << 'EOF'
API_URL=http://YOUR_BACKEND_HOST:8080
EDGE_TTS_VOICE=en-US-EmmaMultilingualNeural
EDGE_TTS_RATE=-20%
EDGE_TTS_PITCH=+0Hz
EDGE_TTS_VOLUME=+0%
EOF
```

The script uses `python-dotenv` to load these settings.

## 2. Manual Runs

From the repo root or `sbc/`:

```bash
source sbc/venv/bin/activate

# Health check to verify connectivity to backend
python sbc/rpi.py health

# Start the infinite main loop (poll commands + capture)
python sbc/rpi.py
```

Logs will be printed to stdout and will show camera capture, API calls, and TTS activity.

## 3. Run on Boot with systemd (Recommended)

Use the helper script `run-rpi-boot.sh` to create and enable a `systemd` service that runs `rpi.py` on startup.

From the repo root:

```bash
cd sbc
chmod +x run-rpi-boot.sh
./run-rpi-boot.sh
```

The script will:

- Detect the repo root and Python binary (prefers `sbc/venv/bin/python` if it exists).
- Write `/etc/systemd/system/infineon-rpi-client.service`.
- Set the working directory to the repo root so `client/test_images` paths work.
- Enable and start the service via `systemctl`.

By default, it assumes the service user is `pi`. To override:

```bash
SERVICE_USER=myuser ./run-rpi-boot.sh
```

### Checking status and logs

After the script runs, you can inspect the service:

```bash
sudo systemctl status infineon-rpi-client.service
sudo journalctl -u infineon-rpi-client.service -f
```

To stop or disable on boot:

```bash
sudo systemctl stop infineon-rpi-client.service
sudo systemctl disable infineon-rpi-client.service
```


