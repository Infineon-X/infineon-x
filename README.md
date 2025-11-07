<div align="center">

# **infineon-x**

End-to-end facial recognition stack and control surface in one repo. Train models, serve an API, and ship a Next.js dashboard without juggling multiple projects.

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](multi-face-rec/requirements.txt)&ensp;
[![Flask API](https://img.shields.io/badge/Backend-Flask-000000?logo=flask&logoColor=white)](multi-face-rec/api)&ensp;
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-000000?logo=nextdotjs&logoColor=white)](ix/)&ensp;
[![Deploy with Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)](multi-face-rec/Dockerfile)

<h3>

[Overview](#repo-highlights) &nbsp;|&nbsp;
[Quick Start](#quick-start) &nbsp;|&nbsp;
[Repo Layout](#repo-layout) &nbsp;|&nbsp;
[Docs & Extras](#docs--extras)

</h3>

</div>

## Repo Highlights

- **Two-track monorepo** – `multi-face-rec/` handles model training + inference; `ix/` ships the React 19 dashboard scaffold.
- **Hardware ready** – Orange Pi client scripts and setup automation bake in camera capture and deployment scripts.
- **API first** – Flask REST service plus CLI utilities for single-shot, health, and continuous recognition.
- **Frontend friendly** – Modern Next.js (App Router) starter ready to integrate live recognition results.

## Quick Start

### `multi-face-rec/` (Face Recognition Stack)

```bash
cd multi-face-rec
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
3. Boot the API (defaults to `http://localhost:5001`):
   ```bash
   python api/app.py
   ```
4. Try the Orange Pi client:
   ```bash
   python client/orangepi_client.py           # single capture
   python client/orangepi_client.py health    # ping the API
   python client/orangepi_client.py continuous 5
   ```

**Extras**
- `recognize.py` – batch test static images and export labeled outputs.
- `realtime_recognition.py` – OpenCV live window (press `q` to stop).
- `Dockerfile` – containerized Gunicorn build for Fly, Railway, or bare metal.
- `setup_orangepi.sh` – one-liner bootstrap for Orange Pi hardware.

### `ix/` (Next.js Frontend Scaffold)

```bash
cd ix
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
| `multi-face-rec/api/` | Flask REST API exposed for recognition and health checks. |
| `multi-face-rec/client/` | Orange Pi-friendly CLI capture tooling and utilities. |
| `multi-face-rec/training/` | Expected directory for per-person training images. |
| `multi-face-rec/realtime_recognition.py` | Local OpenCV streaming demo. |
| `ix/` | Next.js 16 (React 19) app scaffold with Tailwind-ready setup. |

## Docs & Extras

- Connect the dashboard to the API for upload/review flows.
- Add automated smoke tests (API + client) before deploying to constrained hardware.
- Package the backend with the provided Dockerfile or integrate with CI/CD.
