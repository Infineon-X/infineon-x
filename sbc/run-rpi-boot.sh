#!/usr/bin/env bash

set -euo pipefail

echo "=== infineon-x: Raspberry Pi boot service setup ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SERVICE_NAME="infineon-rpi-client.service"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}"
WORKING_DIR="${REPO_ROOT}"
PYTHON_BIN="${REPO_ROOT}/sbc/venv/bin/python"

# Determine which user the systemd service should run as:
# 1) If SERVICE_USER is provided in the environment, use that.
# 2) Else, if a 'pi' user exists (typical Raspberry Pi OS), use 'pi'.
# 3) Else, fall back to the current user running this script.
if [[ -n "${SERVICE_USER:-}" ]]; then
  SERVICE_USER="${SERVICE_USER}"
elif id -u pi >/dev/null 2>&1; then
  SERVICE_USER="pi"
else
  SERVICE_USER="$(whoami)"
fi

if [[ ! -d "/run/systemd/system" ]]; then
  echo "❌ This script must be run on a system using systemd (like Raspberry Pi OS)."
  exit 1
fi

if [[ ! -x "${PYTHON_BIN}" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
  else
    echo "❌ Could not find python3. Please install Python 3 and re-run."
    exit 1
  fi
fi

RPI_CLIENT="${REPO_ROOT}/sbc/rpi.py"
if [[ ! -f "${RPI_CLIENT}" ]]; then
  echo "❌ Could not find rpi.py at ${RPI_CLIENT}."
  exit 1
fi

echo "Using:"
echo "  Repo root     : ${REPO_ROOT}"
echo "  Working dir   : ${WORKING_DIR}"
echo "  Python binary : ${PYTHON_BIN}"
echo "  Service user  : ${SERVICE_USER}"
echo "  Service file  : ${SERVICE_PATH}"
echo

read -r -p "Proceed to create/update and enable ${SERVICE_NAME}? [y/N] " CONFIRM
if [[ "${CONFIRM}" != "y" && "${CONFIRM}" != "Y" ]]; then
  echo "Aborted by user."
  exit 0
fi

sudo tee "${SERVICE_PATH}" >/dev/null <<EOF
[Unit]
Description=infineon-x Raspberry Pi Face Recognition Client
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${WORKING_DIR}
ExecStart=${PYTHON_BIN} ${RPI_CLIENT}
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Wrote systemd unit to ${SERVICE_PATH}"

echo "Reloading systemd daemon and enabling service..."
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

echo
echo "✅ Service ${SERVICE_NAME} is enabled and started."
echo "Check status with:"
echo "  sudo systemctl status ${SERVICE_NAME}"
echo "Follow logs with:"
echo "  journalctl -u ${SERVICE_NAME} -f"


