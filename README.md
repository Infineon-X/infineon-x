<div align="center">

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Infineon-Logo.svg/1200px-Infineon-Logo.svg.png" alt="Infineon Logo" width="110" />
<!-- <br/> -->
<img src="https://www.deanza.edu/logo/images/DAC_Logo_Black.png" alt="De Anza College Logo" width="110" />
<br/>
<sub><i>Main funding provided by Infineon &amp; De Anza College</i></sub>

# **project infineon-x**

End-to-end facial recognition stack and control surface in one repo. Train models, serve an API, and ship a Next.js dashboard without juggling multiple projects.

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](backend/requirements.txt)&ensp;
[![Flask API](https://img.shields.io/badge/Backend-Flask-000000?logo=flask&logoColor=white)](backend/api)&ensp;
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-000000?logo=nextdotjs&logoColor=white)](ix/)&ensp;
[![Deploy with Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)](backend/Dockerfile)&ensp;
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)&ensp;
[![Jupyter Notebook](https://img.shields.io/badge/Jupyter-Notebook-F37626?logo=jupyter&logoColor=white)](https://jupyter.org/)&ensp;
[![pickle](https://img.shields.io/badge/pickle-Serialization-313131?logo=python&logoColor=white)](https://docs.python.org/3/library/pickle.html)&ensp;
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Ready-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)&ensp;
[![Microsoft Edge TTS](https://img.shields.io/badge/Microsoft%20Edge--tts-Speech-0078D7?logo=microsoftedge&logoColor=white)](https://pypi.org/project/edge-tts/)&ensp;
[![OpenCV](https://img.shields.io/badge/OpenCV-4.x-5C3EE8?logo=opencv&logoColor=white)](https://opencv.org/)
<br />
[![Cypress PSoC](https://img.shields.io/badge/Cypress-PSoC-00819D?logo=cypress&logoColor=white)](https://www.infineon.com/cms/en/product/microcontroller/32-bit-arm-cortex-m-microcontroller/psoc-6-cypress/) &ensp;
[![Raspberry Pi](https://img.shields.io/badge/RaspberryPi-Supported-A22846?logo=raspberrypi&logoColor=white)](https://www.raspberrypi.org/) &ensp;
[![dlib](https://img.shields.io/badge/dlib-Recognizers-0076B9?logo=python&logoColor=white)](https://github.com/davisking/dlib)

<h3>

[Overview](#repo-highlights) &nbsp;|&nbsp;
[Quick Start](#quick-start) &nbsp;|&nbsp;
[Repo Layout](#repo-layout) &nbsp;|&nbsp;
[Docs & Extras](#docs--extras)

</h3>

</div>

## Contributors

- Saba @sabaflz
- Kevin 
- Charles
- Jay
- Ansel
- Inky 



## Repo Highlights

- **Two-track monorepo** – `backend/` handles model training + inference; `ix/` ships the React 19 dashboard scaffold.
- **Hardware ready** – Orange Pi client scripts with infinite running capabilities (bash script + systemd service) for continuous monitoring.
- **API first** – Flask REST service plus CLI utilities for single-shot, health, and continuous recognition.
- **Frontend friendly** – Modern Next.js (App Router) starter ready to integrate live recognition results.

## Quick Start

### `backend/` (Face Recognition Stack)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

1. Drop labeled images into `training/<person_name>/`.
2. Train models (writes `encodings.pkl` + `trained_folders.csv`):
   ```bash
   python train.py
   ```
3. Boot the API (defaults to `http://localhost:5000`):
   ```bash
   python api/app.py
   ```

### `sbc/` (Orange Pi Client)

```bash
cd sbc
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Single-shot and health checks:**
```bash
python orangepi_client.py           # single capture
python orangepi_client.py health    # ping the API
python orangepi_client.py continuous 5  # continuous monitoring
```

**Infinite running (production-ready):**

1. **Bash script with auto-restart** (recommended for testing):
   ```bash
   ./run_continuous.sh 5  # captures every 5 seconds, auto-restarts on crash
   ```

2. **Systemd service** (recommended for production):
   ```bash
   # Edit paths in orangepi-client.service first
   sudo cp orangepi-client.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable orangepi-client.service
   sudo systemctl start orangepi-client.service
   sudo systemctl status orangepi-client.service  # check status
   sudo journalctl -u orangepi-client.service -f  # view logs
   ```

**Extras**
- `setup_orangepi.sh` – one-liner bootstrap for Orange Pi hardware (installs dependencies, creates venv).
- `run_continuous.sh` – bash script with auto-restart for continuous monitoring.
- `orangepi-client.service` – systemd service file for production deployment.

### `ix/` (Next.js Frontend Scaffold)

```bash
cd ix-face-enroll
pnpm install          # swap for npm/yarn if you prefer
pnpm dev
```

- Visit `http://localhost:3000` to see the starter view in `app/page.tsx`.
- Wire it up to the Flask API (upload captures, poll `/health`, display recognition events).
- Production helpers:
  ```bash
  pnpm build
  pnpm start          # serve the built app
  pnpm lint
  ```

## Repo Layout

| Path | Description |
| --- | --- |
| `backend/api/` | Flask REST API exposed for recognition and health checks. |
| `backend/training/` | Expected directory for per-person training images. |
| `sbc/` | Orange Pi client scripts with infinite running capabilities. |
| `sbc/orangepi_client.py` | Python client for capturing and sending images to API. |
| `sbc/run_continuous.sh` | Bash script with auto-restart for continuous monitoring. |
| `sbc/orangepi-client.service` | Systemd service file for production deployment. |
| `sbc/setup_orangepi.sh` | One-liner bootstrap script for Orange Pi hardware setup. |
| `model-train/` | Model training utilities and scripts. |
| `ix/` | Next.js 16 (React 19) app scaffold with Tailwind-ready setup. |

## Docs & Extras

- Connect the dashboard to the API for upload/review flows.
- Add automated smoke tests (API + client) before deploying to constrained hardware.
- Package the backend with the provided Dockerfile or integrate with CI/CD.
