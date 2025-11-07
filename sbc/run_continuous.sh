#!/bin/bash

# Infinite running script for Orange Pi face recognition client
# This script will restart the client if it crashes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Default interval (seconds between captures)
INTERVAL=${1:-5}

echo "=========================================="
echo "Starting Face Recognition Client"
echo "Interval: ${INTERVAL} seconds"
echo "Press Ctrl+C to stop"
echo "=========================================="

# Infinite loop with auto-restart on failure
while true; do
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting client..."
    
    # Run the client with continuous monitoring
    python3 orangepi_client.py continuous "$INTERVAL"
    
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Client exited normally"
        break
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Client crashed with exit code $EXIT_CODE"
        echo "Restarting in 5 seconds..."
        sleep 5
    fi
done

echo "$(date '+%Y-%m-%d %H:%M:%S') - Client stopped"

