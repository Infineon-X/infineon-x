from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import pickle
import numpy as np
from PIL import Image
import os
from datetime import datetime
from zoneinfo import ZoneInfo
import shutil
import queue
import threading
from . import logger  # Import the new logger module as a package-relative import
import dotenv

dotenv.load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Logger DB
logger.init_db()

# Load encodings at startup
encodings_path = os.path.join(os.path.dirname(__file__), '..', 'encodings.pkl')
temp_enrollments_path = os.path.join(os.path.dirname(__file__), '..', 'temp_enrollments')

# Ensure temp enrollments directory exists
os.makedirs(temp_enrollments_path, exist_ok=True)

print(f"Loading face encodings from: {encodings_path}")
encodings = None

# Raspberry Pi Management
pi_command_queue = queue.Queue()
pi_state = {
    "status": "unknown", 
    "last_updated": None,
    "last_result": None
}

PACIFIC_TIMEZONE = ZoneInfo("America/Los_Angeles")


def get_pacific_time(dt: datetime | None = None) -> datetime:
    """Return a timezone-aware datetime in US Pacific time."""
    if dt is None:
        return datetime.now(tz=PACIFIC_TIMEZONE)
    if dt.tzinfo is None:
        # Assume naive datetimes are in UTC and convert to Pacific
        return dt.replace(tzinfo=ZoneInfo("UTC")).astimezone(PACIFIC_TIMEZONE)
    return dt.astimezone(PACIFIC_TIMEZONE)


def format_pacific_time(dt: datetime | None = None) -> str:
    """
    Format time as: Thu  4 Dec 04:14:42 PST 2025
    Always in US Pacific time (America/Los_Angeles).
    """
    pacific_dt = get_pacific_time(dt)
    weekday = pacific_dt.strftime("%a")
    # Space-padded day (single-digit days get a leading space)
    day_str = f"{pacific_dt.day:2d}"
    month = pacific_dt.strftime("%b")
    time_str = pacific_dt.strftime("%H:%M:%S")
    tz_name = pacific_dt.strftime("%Z")
    year = pacific_dt.strftime("%Y")
    return f"{weekday} {day_str} {month} {time_str} {tz_name} {year}"

def reload_encodings():
    """Reload encodings from file into memory"""
    global encodings
    try:
        if os.path.exists(encodings_path):
            with open(encodings_path, "rb") as f:
                encodings = pickle.load(f)
            print(f"✅ Reloaded {len(encodings['encodings'])} face encodings")
            print(f"✅ Known people: {set(encodings['names'])}")
        else:
            print("⚠️ No encodings file found, starting fresh")
            encodings = {"names": [], "encodings": []}
    except Exception as e:
        print(f"❌ Error loading encodings: {e}")
        encodings = None

# Initial load
reload_encodings()

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'name': 'Face Recognition API',
        'version': '1.0',
        'status': 'healthy' if encodings else 'unhealthy',
        'endpoints': {
            '/': 'GET - API info',
            '/health': 'GET - Health check',
            '/recognize': 'POST - Recognize faces (multipart/form-data with "image" field)',
            '/enroll': 'POST - Enroll face images (multipart/form-data with "name" and "image" fields)',
            '/train': 'POST - Train model with enrolled images (application/json with "name" field)',
            '/logs': 'GET - Retrieve system logs',
            '/pi/command': 'POST/GET - Send or retrieve Pi commands',
            '/pi/status': 'POST/GET - Update or retrieve Pi status',
            '/pi/results': 'POST/GET - Update or retrieve Pi recognition results'
        }
    })

@app.route('/health', methods=['GET'])
def health():
    if encodings is None:
        return jsonify({
            'status': 'unhealthy',
            'error': 'Encodings not loaded'
        }), 500
    
    return jsonify({
        'status': 'healthy',
        'faces_loaded': len(encodings['encodings']),
        'known_people': list(set(encodings['names']))
    })

@app.route('/logs', methods=['GET'])
def get_logs():
    """Retrieve system logs"""
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        endpoint = request.args.get('endpoint')
        event_type = request.args.get('event_type')
        success = request.args.get('success')
        if success is not None:
            success = success.lower() == 'true'
            
        result = logger.get_logs(limit, offset, endpoint, event_type, success)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recognize', methods=['POST'])
def recognize():
    if encodings is None:
        return jsonify({
            'success': False,
            'error': 'Model not loaded'
        }), 500
    
    try:
        # Check if image is provided
        if 'image' not in request.files:
            logger.log_event('/recognize', 'recognition', False, 'No image provided')
            return jsonify({
                'success': False,
                'error': 'No image provided. Send as form-data with key "image"'
            }), 400
        
        image_file = request.files['image']
        
        # Open and convert image
        image = Image.open(image_file.stream)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image_array = np.array(image)
        
        print(f"Processing image: {image.width}x{image.height}")
        
        # Detect faces
        face_locations = face_recognition.face_locations(image_array, model="hog")
        face_encodings = face_recognition.face_encodings(image_array, face_locations)
        
        print(f"Found {len(face_encodings)} face(s)")
        
        results = []
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Match faces
            matches = face_recognition.compare_faces(
                encodings["encodings"], 
                face_encoding,
                tolerance=0.6
            )
            
            name = "Unknown"
            confidence = 0
            
            if True in matches:
                face_distances = face_recognition.face_distance(
                    encodings["encodings"], 
                    face_encoding
                )
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = encodings["names"][best_match_index]
                    confidence = (1 - face_distances[best_match_index]) * 100
            
            results.append({
                'name': name,
                'confidence': float(confidence),
                'location': {
                    'top': int(top),
                    'right': int(right),
                    'bottom': int(bottom),
                    'left': int(left)
                }
            })
            
            print(f"  - {name} ({confidence:.1f}%)")
        
        # Log the recognition event
        log_msg = f"Recognized {len(results)} face(s)"
        logger.log_event('/recognize', 'recognition', True, log_msg, {
            'faces': results,
            'image_size': {'width': image.width, 'height': image.height},
            'total_faces': len(results)
        })

        return jsonify({
            'success': True,
            'faces': results,
            'total_faces': len(results),
            'image_size': {
                'width': image.width,
                'height': image.height
            }
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        logger.log_event('/recognize', 'error', False, str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/enroll', methods=['POST'])
def enroll():
    """Receive and store enrollment images temporarily"""
    try:
        # Check if name and image are provided
        if 'name' not in request.form:
            return jsonify({
                'success': False,
                'error': 'No name provided. Send as form-data with key "name"'
            }), 400
        
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image provided. Send as form-data with key "image"'
            }), 400
        
        name = request.form['name'].strip()
        if not name:
            return jsonify({
                'success': False,
                'error': 'Name cannot be empty'
            }), 400
        
        image_file = request.files['image']
        
        # Validate image and detect face
        try:
            image = Image.open(image_file.stream)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            image_array = np.array(image)
        except Exception as e:
            logger.log_event('/enroll', 'enrollment_error', False, f'Invalid image: {str(e)}', {'name': name})
            return jsonify({
                'success': False,
                'error': f'Invalid image format: {str(e)}'
            }), 400
        
        # Detect faces in the image
        face_locations = face_recognition.face_locations(image_array, model="hog")
        face_encodings = face_recognition.face_encodings(image_array, face_locations)
        
        if len(face_encodings) == 0:
            return jsonify({
                'success': False,
                'error': 'No face detected in image. Please ensure a clear face is visible.'
            }), 400
        
        if len(face_encodings) > 1:
            return jsonify({
                'success': False,
                'error': 'Multiple faces detected. Please capture only one person per image.'
            }), 400
        
        # Create directory for this person's enrollment
        person_dir = os.path.join(temp_enrollments_path, name)
        os.makedirs(person_dir, exist_ok=True)
        
        # Save image with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        image_filename = f"{timestamp}.jpg"
        image_path = os.path.join(person_dir, image_filename)
        
        # Reset stream and save
        image_file.stream.seek(0)
        image.save(image_path, 'JPEG', quality=95)
        
        # Count images for this person
        image_count = len([f for f in os.listdir(person_dir) if f.endswith('.jpg')])
        
        print(f"✅ Enrolled image for {name}: {image_filename} (total: {image_count})")
        
        logger.log_event('/enroll', 'enrollment', True, f'Enrolled image for {name}', {
            'name': name,
            'image_filename': image_filename,
            'total_images': image_count
        })
        
        return jsonify({
            'success': True,
            'message': f'Image saved successfully',
            'image_count': image_count
        })
        
    except Exception as e:
        print(f"Error in enroll: {str(e)}")
        logger.log_event('/enroll', 'error', False, str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/train', methods=['POST'])
def train():
    """Train model with enrolled images for a specific person"""
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        if 'name' not in data:
            return jsonify({
                'success': False,
                'error': 'No name provided in request body'
            }), 400
        
        name = data['name'].strip()
        if not name:
            return jsonify({
                'success': False,
                'error': 'Name cannot be empty'
            }), 400
        
        person_dir = os.path.join(temp_enrollments_path, name)
        
        if not os.path.exists(person_dir):
            return jsonify({
                'success': False,
                'error': f'No enrollment images found for {name}'
            }), 404
        
        # Get all images for this person
        image_files = [f for f in os.listdir(person_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
        
        if len(image_files) == 0:
            return jsonify({
                'success': False,
                'error': f'No images found for {name}'
            }), 400
        
        print(f"Training model for {name} with {len(image_files)} images...")
        
        # Load existing encodings or create new
        if encodings is None or not os.path.exists(encodings_path):
            print("Starting fresh training...")
            names_list = []
            encodings_list = []
        else:
            names_list = list(encodings['names'])
            encodings_list = list(encodings['encodings'])
        
        faces_added = 0
        
        # Process each image
        for image_file in image_files:
            image_path = os.path.join(person_dir, image_file)
            try:
                img = face_recognition.load_image_file(image_path)
                face_locations = face_recognition.face_locations(img, model="hog")
                face_encodings_batch = face_recognition.face_encodings(img, face_locations)
                
                # Add each face encoding found in the image
                for face_encoding in face_encodings_batch:
                    names_list.append(name)
                    encodings_list.append(face_encoding)
                    faces_added += 1
                    
            except Exception as e:
                print(f"Warning: Failed to process {image_file}: {str(e)}")
                continue
        
        if faces_added == 0:
            return jsonify({
                'success': False,
                'error': 'No valid faces found in enrollment images'
            }), 400
        
        # Save updated encodings
        updated_encodings = {"names": names_list, "encodings": encodings_list}
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(encodings_path), exist_ok=True)
        
        with open(encodings_path, "wb") as f:
            pickle.dump(updated_encodings, f)
        
        print(f"✅ Saved updated encodings to {encodings_path}")
        print(f"✅ Total faces: {len(encodings_list)}")
        
        # Hot reload encodings
        reload_encodings()
        
        # Clean up temporary enrollment directory
        try:
            shutil.rmtree(person_dir)
            print(f"✅ Cleaned up temporary enrollment directory for {name}")
        except Exception as e:
            print(f"Warning: Failed to clean up {person_dir}: {str(e)}")
        
        logger.log_event('/train', 'training', True, f'Training complete for {name}', {
            'name': name,
            'faces_added': faces_added,
            'total_faces': len(encodings_list)
        })
        
        return jsonify({
            'success': True,
            'message': f'Training complete for {name}',
            'faces_added': faces_added,
            'total_faces': len(encodings_list)
        })
        
    except Exception as e:
        print(f"Error in train: {str(e)}")
        logger.log_event('/train', 'error', False, str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# --- Pi Management Endpoints ---

@app.route('/pi/command', methods=['POST', 'GET'])
def pi_command():
    if request.method == 'POST':
        # Add command to queue
        data = request.get_json()
        command = data.get('command')
        if not command:
            return jsonify({'success': False, 'error': 'No command provided'}), 400
            
        pi_command_queue.put(command)
        logger.log_event('/pi/command', 'pi_command_queued', True, f"Queued command: {command}")
        return jsonify({'success': True, 'message': f"Command '{command}' queued"})
    
    else:
        # Get next command from queue (called by Pi)
        try:
            command = pi_command_queue.get_nowait()
            return jsonify({'command': command})
        except queue.Empty:
            return jsonify({'command': None})

@app.route('/pi/status', methods=['POST', 'GET'])
def pi_status_endpoint():
    if request.method == 'POST':
        # Update status (called by Pi)
        data = request.get_json()
        status = data.get('status')
        if status:
            pi_state['status'] = status
            # Store last_updated as a formatted Pacific Time string
            pi_state['last_updated'] = format_pacific_time()
            logger.log_event('/pi/status', 'pi_status_update', True, f"Pi status: {status}", data)
            return jsonify({'success': True})
        return jsonify({'success': False, 'error': 'No status provided'}), 400
    
    else:
        # Get status (called by UI)
        return jsonify(pi_state)

@app.route('/pi/results', methods=['POST', 'GET'])
def pi_results():
    if request.method == 'POST':
        # Update results (called by Pi)
        data = request.get_json()
        pi_state['last_result'] = data
        
        # Log interesting results
        faces = data.get('faces', [])
        if faces:
            logger.log_event('/pi/results', 'pi_recognition', True, f"Pi detected {len(faces)} faces", data)
            
        return jsonify({'success': True})
    
    else:
        # Get last result (called by UI)
        return jsonify(pi_state.get('last_result') or {})

if __name__ == '__main__':
    print(f"Starting server on port {os.environ.get('PORT', 8080)}")
    app.run(host='0.0.0.0', port=os.environ.get('PORT', 8080), debug=False)