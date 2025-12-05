#!/usr/bin/env python3

import asyncio
import os
import subprocess
import tempfile
import time
from datetime import datetime
import json

import cv2
import requests
from dotenv import load_dotenv

#GPIO setup
from gpiozero import Button
from signal import pause
Trigger_GPIO = 16
import signal
import sys


def trigger_received():
    print("🔔 PSOC Trigger received!")
    capture_and_recognize()

try:
    import edge_tts  # type: ignore[import]
except ImportError as edge_tts_error:  # pragma: no cover - handled at runtime
    edge_tts = None  # type: ignore
    EDGE_TTS_IMPORT_ERROR = edge_tts_error
else:
    EDGE_TTS_IMPORT_ERROR = None
load_dotenv()

# grab the api url from env or just use localhost
API_URL = os.getenv('API_URL', 'http://138.197.234.202:8080')

SESSION_USER_AGENT = 'OrangePi-Client/1.0'

# Create a session for connection pooling and better performance
session = requests.Session()
session.headers.update({'User-Agent': SESSION_USER_AGENT})

# Text-to-speech configuration
TTS_VOICE = os.getenv('EDGE_TTS_VOICE', 'en-US-EmmaMultilingualNeural')
TTS_RATE = os.getenv('EDGE_TTS_RATE', '-20%')
TTS_PITCH = os.getenv('EDGE_TTS_PITCH', '+0Hz')
TTS_VOLUME = os.getenv('EDGE_TTS_VOLUME', '+0%')
TTS_OUTPUT_FILE = os.getenv('EDGE_TTS_OUTPUT', 'output.mp3')

def parse_name_with_relation(name_text):
    """Parse name with relation convention: name__rel__relation"""
    if '__rel__' in name_text:
        parts = name_text.split('__rel__', 1)
        name = parts[0].strip()
        relation = parts[1].strip() if len(parts) > 1 else None
        return name, relation
    return name_text, None

def format_name_for_display(name_text):
    """Normalize underscores for nicer speech/output"""
    if not name_text or name_text == "Unknown":
        return name_text
    return " ".join(name_text.replace("_", " ").split())

async def generate_tts_audio(text: str) -> str:
    """Generate speech using edge_tts"""
    if EDGE_TTS_IMPORT_ERROR is not None:
        raise RuntimeError("edge_tts dependency missing") from EDGE_TTS_IMPORT_ERROR

    communicate = edge_tts.Communicate(
        text,
        TTS_VOICE,
        rate=TTS_RATE,
        pitch=TTS_PITCH,
        volume=TTS_VOLUME,
    )
    await communicate.save(TTS_OUTPUT_FILE)
    return os.path.abspath(TTS_OUTPUT_FILE)

def speak(text: str) -> None:
    """Synthesize speech using edge_tts and play it"""
    if not text:
        return

    try:
        audio_path = asyncio.run(generate_tts_audio(text))
        print(f"🔊 Playing TTS audio: {audio_path}")
        subprocess.run(
            ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", audio_path],
            check=True,
        )
    except Exception as error:
        print(f"❌ TTS Error: {error}")

def update_pi_status(status):
    """Update the Pi's status on the backend"""
    try:
        session.post(f"{API_URL}/pi/status", json={'status': status}, timeout=5)
    except Exception as e:
        print(f"⚠️ Failed to update status: {e}")

def post_results(result, speech_text=None):
    """Post recognition results to backend"""
    try:
        payload = result.copy()
        if speech_text:
            payload['speech_text'] = speech_text
        session.post(f"{API_URL}/pi/results", json=payload, timeout=5)
    except Exception as e:
        print(f"⚠️ Failed to post results: {e}")

def capture_and_recognize(max_retries=3, retry_delay=2):
    """Capture, recognize, announce, and report"""
    
    print("\n📸 Capturing photo...")
    update_pi_status("capturing")
    
    # Setup storage
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    test_images_dir = os.path.join(repo_root, "client", "test_images")
    os.makedirs(test_images_dir, exist_ok=True)
    
    # Capture
    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        print("❌ Camera error")
        update_pi_status("error_camera")
        return None
    
    time.sleep(0.5) # Warmup
    ret, frame = camera.read()
    camera.release()
    
    if not ret:
        print("❌ Frame capture error")
        update_pi_status("error_frame")
        return None

    # Save temp image
    image_path = os.path.join(test_images_dir, f"capture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
    if not cv2.imwrite(image_path, frame):
        print("❌ Save error")
        return None
    
    print(f"✅ Saved: {image_path}")
    
    # Recognize
    print("📤 Sending to API...")
    result = None
    try:
        with open(image_path, 'rb') as img_file:
            files = {'image': (os.path.basename(image_path), img_file, 'image/jpeg')}
            response = session.post(f"{API_URL}/recognize", files=files, timeout=30)
            
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                faces = result.get('faces', [])
                print(f"✅ Found {len(faces)} face(s)")
                
                speech_text = ""
                if faces:
                    recognized_names = []
                    for face in faces:
                        name = face.get('name', 'Unknown')
                        confidence = face.get('confidence', 0)
                        if name != "Unknown" and confidence >= 50.0:
                            recognized_names.append(name)
                    
                    if recognized_names:
                        unique_names = sorted(list(set(recognized_names)))
                        fragments = []
                        for name_text in unique_names:
                            base, relation = parse_name_with_relation(name_text)
                            base = format_name_for_display(base)
                            fragments.append(f"{base}, your {relation}" if relation else base)
                        
                        if len(fragments) == 1:
                            speech_text = f"I see {fragments[0]}."
                        else:
                            speech_text = f"I see {len(fragments)} people: {', '.join(fragments[:-1])} and {fragments[-1]}."
                        
                        print(f"🔊 Speaking: {speech_text}")
                        speak(speech_text)
                    else:
                        print("🔊 No known faces")
                
                # Post results back to backend
                post_results(result, speech_text)
            else:
                print(f"❌ API Error: {result.get('error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Cleanup
    if os.path.exists(image_path):
        try:
            # Keep image only if faces found (optional logic, currently keeping none or implementing retention logic)
             os.remove(image_path) 
        except: pass
        
    return result

def psoc_interrupt():
    """Trigger PSOC capture via GPIO"""
    print("\n⚡ Triggering PSOC capture...")
    update_pi_status("Waiting for trigger")
    
    trigger = Button(Trigger_GPIO, pull_up=False, bounce_time=0.5)
    trigger.when_pressed = lambda: trigger_received()

    try:
        pause()
    finally:
        trigger.close()
        update_pi_status("idle")
        

def check_command_queue():
    """Poll backend for commands"""
    try:
        resp = session.get(f"{API_URL}/pi/command", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            return data.get('command')
    except Exception:
        pass
    return None

def main_loop():
    """Main control loop"""
    print(f"🚀 Pi Client Started. API: {API_URL}")
    update_pi_status("idle")
    
    continuous_active = False
    continuous_interval = 2
    last_capture_time = 0
    
    while True:
        try:
            # 1. Poll for commands
            cmd = check_command_queue()
            
            if cmd:
                print(f"📥 Received command: {cmd}")
                
                if cmd == 'single_capture':
                    continuous_active = False
                    capture_and_recognize()
                    update_pi_status("idle")

                #psoc mode may be exited w/ system interrupt
                elif cmd == 'psoc_capture':
                    continuous_active = False
                    psoc_interrupt()
                    
                elif cmd == 'start_continuous':
                    continuous_active = True
                    print("🔄 Continuous mode STARTED")
                    update_pi_status("continuous_running")
                    
                elif cmd == 'stop':
                    continuous_active = False
                    print("🛑 Continuous mode STOPPED")
                    update_pi_status("idle")
            
            # 2. Handle continuous mode
            if continuous_active:
                now = time.time()
                if now - last_capture_time >= continuous_interval:
                    capture_and_recognize()
                    last_capture_time = time.time()
                    # Ensure status remains 'continuous_running'
                    update_pi_status("continuous_running")
            
            # 3. Sleep briefly to avoid hammering CPU/Network
            time.sleep(1)
            
        except KeyboardInterrupt:
            print("\n👋 Exiting...")
            update_pi_status("offline")
            break
        except Exception as e:
            print(f"❌ Main loop error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    # Support legacy args for backward compatibility testing
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "health":
        # Quick health check then exit
        try:
            resp = session.get(f"{API_URL}/health")
            print(resp.json())
        except Exception as e:
            print(e)
    else:
        main_loop()