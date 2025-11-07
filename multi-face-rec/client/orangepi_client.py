#!/usr/bin/env python3

import requests
import cv2
import time
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()

# grab the api url from env or just use localhost
API_URL = os.getenv('API_URL', 'http://localhost:5001')

# print(API_URL)

def capture_and_recognize():
    """capture a pic, send to the ML model, show the result"""
    
    print("taking a photo...")

    # make sure we've got a test_images folder in the right spot
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    test_images_dir = os.path.join(repo_root, "client", "test_images")
    os.makedirs(test_images_dir, exist_ok=True)
    
    # using camera 1 (change if your cam is different)
    camera = cv2.VideoCapture(0)
    
    if not camera.isOpened():
        print("couldn't open the camera :(")
        return
    
    # letting the camera warm up a bit
    time.sleep(0.5)
    
    # grab one frame
    ret, frame = camera.read()
    camera.release()
    
    if not ret:
        print("couldn't grab an image from the camera")
        return

    # save the image so we can upload it
    image_path = os.path.join(test_images_dir, f"capture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
    print(f"saving image here: {image_path}")
    cv2.imwrite(image_path, frame)
    print(f"saved the photo")

    # now send it to the api and ask for faces
    print("sending image up to the ML model for checking...")
    
    try:
        with open(image_path, 'rb') as img_file:
            files = {'image': img_file}
            response = requests.post(f"{API_URL}/recognize", files=files, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('success'):
                print("="*50)
                print("these are the recognition results")
                print("="*50)
                print(f"found {result['total_faces']} face(s)")
                print(f"image size: {result['image_size']['width']} x {result['image_size']['height']}")
                print()
                
                for i, face in enumerate(result['faces'], 1):
                    print(f"face #{i}:")
                    print(f"  the name: {face['name']}")
                    print(f"  confidence: {face['confidence']:.1f}%")
                    print(f"  location: ({face['location']['left']}, {face['location']['top']}) -> ({face['location']['right']}, {face['location']['bottom']})")
                    print()
                
                return result
            else:
                print(f"didn't work: {result.get('error')}")
        else:
            print(f"server gave an error: code {response.status_code}")
            print(response.text)
            
    except requests.exceptions.Timeout:
        print("the request took too long and timed out")
    except requests.exceptions.RequestException as e:
        print(f"couldn't send the image: {e}")
    except Exception as e:
        print(f"some other error happened: {e}")
    finally:
        # get rid of the image file after sending
        if os.path.exists(image_path):
            os.remove(image_path)

def check_health():
    """just check if the api is up and see what's loaded"""
    health_url = f"{API_URL}/health"
    
    try:
        response = requests.get(health_url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"api status: {data['status']}")
            print(f"faces loaded: {data['faces_loaded']}")
            print(f"people known: {', '.join(data['known_people'])}")
        else:
            print(f"api not healthy (status {response.status_code})")
    except Exception as e:
        print(f"can't reach the api: {e}")

def continuous_monitoring(interval=5):
    """just keeps capturing every so often until you stop it ctrl+c"""
    
    print(f"starting monitoring, grabbing a photo every {interval} seconds")
    print("hit ctrl+c when you're over it\n")
    
    try:
        while True:
            capture_and_recognize()
            print(f"\nwaiting {interval} seconds...\n")
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\nok, stopped monitoring")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "continuous":
            interval = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            continuous_monitoring(interval)
        elif sys.argv[1] == "health":
            check_health()
    else:
        capture_and_recognize()
