# Pi Control Center Implementation Documentation

## Overview

This document outlines the implementation of the **Pi Control Center**, a frontend interface designed to interact with a Raspberry Pi-based face recognition system. The control center allows users to monitor system status, send commands, view live recognition results, and track historical data.

## Key Features

### 1. Real-time Status Monitoring
- **Functionality:** Displays the current operational state of the Raspberry Pi (e.g., `IDLE`, `CONTINUOUS_RUNNING`).
- **Implementation:** Polls the `/api/pi/status` endpoint every 2 seconds.
- **UI:** Updates dynamically with color-coded status indicators (Green for running, Blue for idle, Red for error) using global CSS variables.

### 2. Remote Command Execution
- **Functionality:** Allows the user to control the recognition engine remotely.
- **Commands:**
    - **Capture Once:** Triggers a single face recognition event.
    - **Start Continuous:** Initiates a continuous loop of recognition.
    - **Stop/Idle:** Halts any running processes and returns the system to an idle state.
- **Implementation:** Sends POST requests to `/api/pi/command`.

### 3. Live Recognition Results
- **Functionality:** Shows the most recent output from the recognition engine.
- **Data Displayed:**
    - Spoken text (TTS output).
    - List of detected faces with confidence scores.
    - Bounding box coordinates (handled internally).
- **Implementation:** Polls `/api/pi/results`.

### 4. Local Recognition History
- **Functionality:** Maintains a client-side history of recognized faces and events.
- **Persistence:** Uses browser `localStorage` to save data across page reloads.
- **Logic:**
    - Automatically appends new unique results to the list.
    - Caps the history at the last 50 entries to manage performance.
    - Includes a "Clear History" function.

### 5. System Logs
- **Functionality:** A tabular view of system events for debugging and auditing.
- **Data:** Timestamp, Event Type, Endpoint, Message, and Success status.
- **Implementation:** Fetches from `/api/logs` with pagination support.

---

## Technical Implementation

### Frontend Architecture (`app/pi/page.tsx`)

#### State Management
The page uses React `useState` to manage:
- `status`: Current system state.
- `lastResult`: Most recent recognition JSON.
- `history`: Array of past recognition results.
- `logs`: System log entries.

#### Type Safety
Comprehensive TypeScript interfaces were defined based on actual backend responses to ensure type safety:
- `RecognitionResult`
- `DetectedFace`
- `PiStatusResponse`
- `LogEntry`

#### Styling & Theming
- **Constraint:** Strictly adheres to `app/globals.css`.
- **Method:** Removed all hardcoded Tailwind CSS color classes.
- **Implementation:** Uses inline `style` attributes referencing global CSS variables (e.g., `var(--bg-primary)`, `var(--text-primary)`, `var(--btn-success)`). This ensures perfect consistency with the rest of the application and automatic support for any global theme changes.

### Backend Integration (Next.js API Routes)

To avoid CORS issues and expose a clean API surface, Next.js Route Handlers were implemented as proxies to the backend service:

- **`app/api/pi/status/route.ts`**: GET request to backend `/pi/status`.
- **`app/api/pi/results/route.ts`**: GET request to backend `/pi/results`.
- **`app/api/pi/command/route.ts`**: POST request to backend `/pi/command`.
- **`app/api/logs/route.ts`**: GET request to backend `/logs`.

---

## Bandwidth Analysis

An analysis was conducted to estimate the network usage of the polling mechanism (checking status/results while the Pi is active).

- **Polling Interval:** 2 seconds (configurable).
- **Payload Size:** ~1KB - 2KB per cycle (Headers + JSON).
- **Estimated Usage:**
    - **Per Minute:** ~60 KB
    - **Per Hour:** ~3.6 MB to 7 MB

**Note:** This low bandwidth footprint confirms that the current polling strategy is efficient for typical network environments.

---

## Setup & Usage

1. **Environment Variables:** Ensure `BACKEND_URL` is set (defaults to `http://138.197.234.202:8080`).
2. **Access:** Navigate to `/pi` in the browser.
3. **Operation:** Use the "Commands" panel to start/stop the recognition service. View results in the "Latest Recognition Result" and "History" panels.
