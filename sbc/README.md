# Infinite Running Commands for Orange Pi

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

