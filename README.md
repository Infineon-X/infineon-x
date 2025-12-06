<div align="center">

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Infineon-Logo.svg/1200px-Infineon-Logo.svg.png" alt="Infineon Logo" width="110" />
<!-- <br/> -->
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/De_Anza_College_logo.svg/1024px-De_Anza_College_logo.svg.png" alt="De Anza College Logo" width="110" />
<br/>
<sub><i>main funding provided by infineon & de anza college</i></sub>

# **project infineon-x**

end-to-end facial recognition stack and control surface in one repo. train models, serve an api, and ship a next.js dashboard without juggling multiple projects.

<h3>

[overview](#repo-highlights) &nbsp;|&nbsp;
[quick start](#quick-start) &nbsp;|&nbsp;
[repo layout](#repo-layout) &nbsp;|&nbsp;
[docs & extras](#docs--extras)

</h3>

<!-- End Centered Badges -->

</div>

## contributors

- saba @sabaflz
- kevin 
- charles
- jay
- ansel
- inky 



## repo highlights

- **two-track monorepo** – `backend/` handles model training + inference; `ix/` ships the react 19 dashboard scaffold.
- **hardware ready** – orange pi client scripts with infinite running capabilities (bash script + systemd service) for continuous monitoring.
- **api first** – flask rest service plus cli utilities for single-shot, health, and continuous recognition.
- **frontend friendly** – modern next.js (app router) starter ready to integrate live recognition results.

<img width="3840" height="2486" alt="image" src="https://github.com/user-attachments/assets/f2f96724-158b-490c-8e7e-f15b487f431d" />

## quick start

### `backend/` (face recognition stack)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

1. drop labeled images into `training/<person_name>/`.
2. train models (writes `encodings.pkl` + `trained_folders.csv`):
   ```bash
   python train.py
   ```
3. boot the api (defaults to `http://localhost:5000`):
   ```bash
   python api/app.py
   ```

### `sbc/` (orange pi client)

```bash
cd sbc
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**single-shot and health checks:**
```bash
python orangepi_client.py           # single capture
python orangepi_client.py health    # ping the api
python orangepi_client.py continuous 5  # continuous monitoring
```

**infinite running (production-ready):**

1. **bash script with auto-restart** (recommended for testing):
   ```bash
   ./run_continuous.sh 5  # captures every 5 seconds, auto-restarts on crash
   ```

2. **systemd service** (recommended for production):
   ```bash
   # edit paths in orangepi-client.service first
   sudo cp orangepi-client.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable orangepi-client.service
   sudo systemctl start orangepi-client.service
   sudo systemctl status orangepi-client.service  # check status
   sudo journalctl -u orangepi-client.service -f  # view logs
   ```

**extras**
- `setup_orangepi.sh` – one-liner bootstrap for orange pi hardware (installs dependencies, creates venv).
- `run_continuous.sh` – bash script with auto-restart for continuous monitoring.
- `orangepi-client.service` – systemd service file for production deployment.

### `ix/` (next.js frontend scaffold)

```bash
cd ix-face-enroll
pnpm install          # swap for npm/yarn if you prefer
pnpm dev
```

- visit `http://localhost:3000` to see the starter view in `app/page.tsx`.
- wire it up to the flask api (upload captures, poll `/health`, display recognition events).
- production helpers:
  ```bash
  pnpm build
  pnpm start          # serve the built app
  pnpm lint
  ```


<img width="200" height="2868" alt="Simulator Screenshot - iPhone 17 Pro Max - 2025-12-06 at 00 23 59" src="https://github.com/user-attachments/assets/48a39e16-de69-4a3a-8d9e-1c76745adc2d" />
<img width="200" height="2868" alt="Simulator Screenshot - iPhone 17 Pro Max - 2025-12-06 at 00 24 16" src="https://github.com/user-attachments/assets/85800a9f-5d06-4da3-bfbc-aa423e2302c7" />
<img width="200" height="2868" alt="Simulator Screenshot - iPhone 17 Pro Max - 2025-12-06 at 00 24 21" src="https://github.com/user-attachments/assets/2cd25906-2878-4468-af97-63fc06058982" />
<img width="200" height="2868" alt="Simulator Screenshot - iPhone 17 Pro Max - 2025-12-06 at 00 24 26" src="https://github.com/user-attachments/assets/1ac8340d-208b-4804-968d-51ba1b4832a3" />

  

## repo layout

| path | description |
| --- | --- |
| `backend/api/` | flask rest api exposed for recognition and health checks. |
| `backend/training/` | expected directory for per-person training images. |
| `sbc/` | orange pi client scripts with infinite running capabilities. |
| `sbc/orangepi_client.py` | python client for capturing and sending images to api. |
| `sbc/run_continuous.sh` | bash script with auto-restart for continuous monitoring. |
| `sbc/orangepi-client.service` | systemd service file for production deployment. |
| `sbc/setup_orangepi.sh` | one-liner bootstrap script for orange pi hardware setup. |
| `model-train/` | model training utilities and scripts. |
| `ix/` | next.js 16 (react 19) app scaffold with tailwind-ready setup. |

## docs & extras

- connect the dashboard to the api for upload/review flows.
- add automated smoke tests (api + client) before deploying to constrained hardware.
- package the backend with the provided dockerfile or integrate with ci/cd.

<!-- Badges moved above for center alignment -->



<!-- Centered Badges -->
<div align="center">

[![python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](backend/requirements.txt)&ensp;
[![flask api](https://img.shields.io/badge/Backend-Flask-000000?logo=flask&logoColor=white)](backend/api)&ensp;
[![next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-000000?logo=nextdotjs&logoColor=white)](ix/)&ensp;
[![deploy with docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)](backend/Dockerfile)&ensp;
[![typescript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)&ensp;
[![jupyter notebook](https://img.shields.io/badge/Jupyter-Notebook-F37626?logo=jupyter&logoColor=white)](https://jupyter.org/)&ensp;
[![pickle](https://img.shields.io/badge/pickle-Serialization-313131?logo=python&logoColor=white)](https://docs.python.org/3/library/pickle.html)&ensp;
[![tailwindcss](https://img.shields.io/badge/TailwindCSS-Ready-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)&ensp;
[![microsoft edge tts](https://img.shields.io/badge/Microsoft%20Edge--tts-Speech-0078D7?logo=microsoftedge&logoColor=white)](https://pypi.org/project/edge-tts/)&ensp;
[![opencv](https://img.shields.io/badge/OpenCV-4.x-5C3EE8?logo=opencv&logoColor=white)](https://opencv.org/)
<br />
[![cypress psoc](https://img.shields.io/badge/Cypress-PSoC-00819D?logo=cypress&logoColor=white)](https://www.infineon.com/cms/en/product/microcontroller/32-bit-arm-cortex-m-microcontroller/psoc-6-cypress/) &ensp;
[![raspberry pi](https://img.shields.io/badge/RaspberryPi-Supported-A22846?logo=raspberrypi&logoColor=white)](https://www.raspberrypi.org/) &ensp;
[![dlib](https://img.shields.io/badge/dlib-Recognizers-0076B9?logo=python&logoColor=white)](https://github.com/davisking/dlib)

</div>
