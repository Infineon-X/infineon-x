<!-- ef699875-1d3c-4bea-950f-bfc39fcf22fc e7d7e4b5-cba3-477b-9455-693d84b72eda -->
# Face Enrollment and Training System

## Overview

Build a complete face enrollment flow: NextJS app captures photos → Backend stores them → Training endpoint processes and updates model → Hot reload encodings.

## Architecture

### NextJS App (`ix-face-enroll`)

- Name input form before photo capture
- Camera integration for taking photos
- Send images one-by-one to `/enroll` endpoint
- Track enrollment session state
- "Complete Enrollment" button to trigger training

### Backend API (`backend/api/app.py`)

- `/enroll` endpoint: Receive images with person name, store temporarily
- `/train` endpoint: Process stored images, update encodings.pkl, hot reload
- Hot reload mechanism: Reload encodings.pkl into memory after training
- Temporary storage: `backend/temp_enrollments/<person_name>/` for pending enrollments

## Implementation Details

### 1. NextJS Enrollment UI (`ix-face-enroll/app/page.tsx`)

- Add name input field
- Integrate camera using browser MediaDevices API
- Capture button to take photos
- Display captured photos preview
- Upload each photo to `/enroll` endpoint as captured
- "Complete Enrollment" button calls `/train` endpoint
- Show loading states and success/error messages

### 2. Backend Enrollment Endpoint (`backend/api/app.py`)

- `POST /enroll`: Accept `name` (form field) and `image` (file)
- Create `backend/temp_enrollments/<name>/` directory
- Save image with timestamp
- Return success with image count for that person
- Validate: ensure face detected in image before saving

### 3. Backend Training Endpoint (`backend/api/app.py`) must refer from working folder model-train/

- `POST /train`: Accept `name` (form field) 
- Load existing encodings.pkl (or create new)
- Process all images in `backend/temp_enrollments/<name>/`
- Generate face encodings for each image
- Append to encodings list csv with person name
- Save updated encodings.pkl
- Hot reload: Reload encodings into memory
- Clean up temporary enrollment directory
- Return success with training stats

### 4. Hot Reload Mechanism (`backend/api/app.py`)

- Create `reload_encodings()` function
- Call after training completes
- Update global `encodings` variable
- Handle errors gracefully (keep old encodings if reload fails)

### 5. Error Handling

- Validate face detection before saving images
- Handle duplicate names (append or replace)
- Handle training failures (don't delete temp files on error)
- Return clear error messages to frontend

## File Changes

**New Files:**

- `ix-face-enroll/app/enroll/page.tsx` - Enrollment page with camera
- `backend/api/training.py` - Training logic (optional, or inline in app.py) refer from model-train/train.py

**Modified Files:**

- `backend/api/app.py` - Add `/enroll` and `/train` endpoints, hot reload
- `ix-face-enroll/app/page.tsx` - Update or create enrollment UI

## API Endpoints

### POST /enroll

- Body: `multipart/form-data` with `name` (string) and `image` (file)
- Response: `{success: bool, message: string, image_count: int}`

### POST /train  

- Body: `application/json` with `name` (string)
- Response: `{success: bool, message: string, faces_added: int, total_faces: int}`

## Testing Considerations

- Test with multiple images per person
- Test hot reload doesn't break recognition
- Test error cases (no face detected, invalid image, etc.)
- Verify SBC can still use `/recognize` endpoint after training refer sbc/ folder in this repo

### To-dos

- [ ] List all the folder like sbc/ and model-train/
- [ ] Create NextJS enrollment page with name input, camera capture, and photo preview
- [ ] Implement API calls to send images to /enroll endpoint one at a time
- [ ] Add Complete Enrollment button that calls /train endpoint
- [ ] Create POST /enroll endpoint to receive images and store temporarily
- [ ] Create POST /train endpoint to process images and update encodings.pkl
- [ ] Implement hot reload mechanism to reload encodings.pkl after training
- [ ] Add validation and error handling for face detection, duplicate names, and training failures
- [ ] 

## Implementation Status (Dec 3, 2025)

### Completed Features (Pi Control & Logging)
- [x] **SQLite Logging**: Implemented `backend/api/logger.py` with JSON support and daily backups.
- [x] **Pi Control Backend**: Added `/pi/command`, `/pi/status`, `/pi/results` to Flask app.
- [x] **Pi Client Update**: Updated `sbc/rpi.py` to poll for commands and report status.
- [x] **Control Dashboard**: Created `ix-face-enroll/app/pi/page.tsx` for remote management.
