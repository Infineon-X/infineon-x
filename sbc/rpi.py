#!/usr/bin/env python3

import requests
import cv2
import time
from datetime import datetime
import os
import pyttsx3
from dotenv import load_dotenv
load_dotenv()

# grab the api url from env or just use localhost
API_URL = os.getenv('API_URL', 'http://138.197.234.202:8080')

# Create a session for connection pooling and better performance
session = requests.Session()
session.headers.update({'User-Agent': 'OrangePi-Client/1.0'})

def speak(text):
    """speak the text using the system's default speech synthesizer"""
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait() # this line is important to make the speech actually happen

def check_server_connection(max_retries=3, retry_delay=1):
    """Check if server is reachable and healthy"""
    for attempt in range(max_retries):
        try:
            response = session.get(f"{API_URL}/health", timeout=5)
            if response.status_code == 200:
                return True, response.json()
            elif response.status_code == 500:
                data = response.json()
                print(f"⚠️ Server unhealthy: {data.get('error', 'Unknown error')}")
                return False, None
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                print(f"⚠️ Connection attempt {attempt + 1} failed, retrying...")
                time.sleep(retry_delay)
            else:
                print(f"❌ Cannot reach server: {e}")
                return False, None
    return False, None

def capture_and_recognize(max_retries=3, retry_delay=2):
    """capture a pic, send to the ML model, show the result"""
    
    # Check server connection first
    is_connected, health_data = check_server_connection()
    if not is_connected:
        print("❌ Server is not available. Please check if the API is running.")
        return None
    
    if health_data:
        print(f"✅ Server connected - {health_data.get('faces_loaded', 0)} faces loaded")
        known_people = health_data.get('known_people', [])
        if known_people:
            print(f"   Known people: {', '.join(known_people)}")
    
    print("\ntaking a photo...")

    # make sure we've got a test_images folder in the right spot
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    test_images_dir = os.path.join(repo_root, "client", "test_images")
    os.makedirs(test_images_dir, exist_ok=True)
    
    # using camera 2 (change if your cam is different)
    camera = cv2.VideoCapture(1)
    
    if not camera.isOpened():
        print("❌ couldn't open the camera :(")
        return None
    
    # letting the camera warm up a bit
    time.sleep(0.5)
    
    # grab one frame
    ret, frame = camera.read()
    camera.release()
    
    if not ret:
        print("❌ couldn't grab an image from the camera")
        return None

    # save the image so we can upload it
    image_path = os.path.join(test_images_dir, f"capture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
    print(f"💾 saving image: {image_path}")
    
    if not cv2.imwrite(image_path, frame):
        print("❌ failed to save image")
        return None
    
    print("✅ saved the photo")

    # now send it to the api and ask for faces
    print("📤 sending image to ML model...")
    
    try:
        for attempt in range(max_retries):
            try:
                with open(image_path, 'rb') as img_file:
                    files = {'image': (os.path.basename(image_path), img_file, 'image/jpeg')}
                    response = session.post(
                        f"{API_URL}/recognize", 
                        files=files, 
                        timeout=30
                    )
                
                # Handle different status codes
                if response.status_code == 200:
                    try:
                        result = response.json()
                    except ValueError as e:
                        print(f"❌ Invalid JSON response: {e}")
                        print(f"Response text: {response.text[:200]}")
                        break
                    
                    if result.get('success'):
                        print("\n" + "="*50)
                        print("✅ RECOGNITION RESULTS")
                        print("="*50)
                        print(f"Found {result.get('total_faces', 0)} face(s)")
                        
                        image_size = result.get('image_size', {})
                        if image_size:
                            print(f"Image size: {image_size.get('width', '?')} x {image_size.get('height', '?')}")
                        print()
                        
                        faces = result.get('faces', [])
                        if faces:
                            recognized_names = []
                            for i, face in enumerate(faces, 1):
                                name = face.get('name', 'Unknown')
                                confidence = face.get('confidence', 0)
                                
                                print(f"Face #{i}:")
                                print(f"  Name: {name}")
                                print(f"  Confidence: {confidence:.1f}%")
                                
                                location = face.get('location', {})
                                if location:
                                    print(f"  Location: ({location.get('left', '?')}, {location.get('top', '?')}) -> ({location.get('right', '?')}, {location.get('bottom', '?')})")
                                print()
                                
                                # Collect recognized names (skip "Unknown")
                                if name != "Unknown" and confidence >= 50.0:
                                    recognized_names.append(name)
                            
                            # Speak the recognized names
                            if recognized_names:
                                # Remove duplicates while preserving order
                                unique_names = []
                                for name in recognized_names:
                                    if name not in unique_names:
                                        unique_names.append(name)
                                
                                if len(unique_names) == 1:
                                    speech_text = f"I see {unique_names[0]}"
                                else:
                                    speech_text = f"I see {', '.join(unique_names[:-1])}, and {unique_names[-1]}"
                                
                                print(f"🔊 Speaking: {speech_text}")
                                speak(speech_text)
                            else:
                                print("🔊 No recognized faces to announce")
                        else:
                            print("No faces detected in image")
                        
                        print("="*50 + "\n")
                        return result
                    else:
                        error_msg = result.get('error', 'Unknown error')
                        print(f"❌ Recognition failed: {error_msg}")
                        break
                        
                elif response.status_code == 400:
                    try:
                        error_data = response.json()
                        print(f"❌ Bad request: {error_data.get('error', 'Invalid request')}")
                    except:
                        print(f"❌ Bad request: {response.text[:200]}")
                    break
                    
                elif response.status_code == 500:
                    try:
                        error_data = response.json()
                        error_msg = error_data.get('error', 'Server error')
                        print(f"❌ Server error: {error_msg}")
                        if attempt < max_retries - 1:
                            print(f"   Retrying in {retry_delay} seconds...")
                            time.sleep(retry_delay)
                            continue
                    except:
                        print(f"❌ Server error: {response.text[:200]}")
                    break
                else:
                    print(f"❌ Unexpected status code: {response.status_code}")
                    print(f"Response: {response.text[:200]}")
                    break
                    
            except requests.exceptions.Timeout:
                print(f"⏱️ Request timeout (attempt {attempt + 1}/{max_retries})")
                if attempt < max_retries - 1:
                    print(f"   Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    print("❌ Request timed out after all retries")
                    
            except requests.exceptions.ConnectionError as e:
                print(f"🔌 Connection error (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    print(f"   Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    print("❌ Cannot connect to server after all retries")
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ Request error: {e}")
                break
                
            except Exception as e:
                print(f"❌ Unexpected error: {e}")
                break
        
        return None
        
    finally:
        # get rid of the image file after sending
        if os.path.exists(image_path):
            try:
                os.remove(image_path)
            except Exception as e:
                print(f"⚠️ Could not remove temp image: {e}")

def check_health():
    """just check if the api is up and see what's loaded"""
    is_connected, health_data = check_server_connection()
    
    if is_connected and health_data:
        print(f"✅ API Status: {health_data.get('status', 'unknown')}")
        print(f"✅ Faces loaded: {health_data.get('faces_loaded', 0)}")
        known_people = health_data.get('known_people', [])
        if known_people:
            print(f"✅ Known people: {', '.join(known_people)}")
        else:
            print("⚠️ No known people enrolled yet")
    else:
        print("❌ API is not available or unhealthy")

def continuous_monitoring(interval=15):
    """just keeps capturing every so often until you stop it ctrl+c"""
    
    # Check server connection before starting
    is_connected, _ = check_server_connection()
    if not is_connected:
        print("❌ Cannot start monitoring - server is not available")
        return
    
    print(f"🔄 Starting continuous monitoring")
    print(f"   Capture interval: {interval} seconds")
    print(f"   Press Ctrl+C to stop\n")
    
    try:
        while True:
            capture_and_recognize()
            print(f"\n⏳ Waiting {interval} seconds until next capture...\n")
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n✅ Monitoring stopped by user")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "continuous":
            interval = int(sys.argv[2]) if len(sys.argv) > 2 else 15
            continuous_monitoring(interval)
        elif sys.argv[1] == "health":
            check_health()
    else:
        # Default: start continuous monitoring with 15-second interval
        continuous_monitoring(2)
