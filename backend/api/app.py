from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import pickle
import numpy as np
from PIL import Image
import os
from datetime import datetime
import shutil

app = Flask(__name__)
CORS(app)

# Load encodings at startup
encodings_path = os.path.join(os.path.dirname(__file__), '..', 'encodings.pkl')
temp_enrollments_path = os.path.join(os.path.dirname(__file__), '..', 'temp_enrollments')

# Ensure temp enrollments directory exists
try:
    os.makedirs(temp_enrollments_path, exist_ok=True)
except Exception as e:
    print(f"⚠️ Warning: Could not create temp_enrollments directory: {e}")

print(f"Loading face encodings from: {encodings_path}")
encodings = None

def reload_encodings():
    """Reload encodings from file into memory"""
    global encodings
    try:
        if os.path.exists(encodings_path):
            with open(encodings_path, "rb") as f:
                encodings = pickle.load(f)
            # Validate encodings structure
            if not isinstance(encodings, dict) or 'encodings' not in encodings or 'names' not in encodings:
                raise ValueError("Invalid encodings file structure")
            print(f"✅ Reloaded {len(encodings['encodings'])} face encodings")
            print(f"✅ Known people: {set(encodings['names'])}")
        else:
            print("⚠️ No encodings file found, starting fresh")
            encodings = {"names": [], "encodings": []}
    except Exception as e:
        print(f"❌ Error loading encodings: {e}")
        import traceback
        traceback.print_exc()
        # Set to empty dict instead of None to allow app to start
        print("⚠️ Starting with empty encodings - app will be ready for training")
        encodings = {"names": [], "encodings": []}

# Initial load - wrap in try/except to ensure app can start even if this fails
try:
    reload_encodings()
except Exception as e:
    print(f"❌ Critical error during startup: {e}")
    import traceback
    traceback.print_exc()
    encodings = {"names": [], "encodings": []}
    print("⚠️ Starting with empty encodings due to startup error")

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
            '/train': 'POST - Train model with enrolled images (application/json with "name" field)'
        }
    })

@app.route('/health', methods=['GET'])
def health():
    # App is healthy if encodings is not None (even if empty)
    if encodings is None:
        return jsonify({
            'status': 'unhealthy',
            'error': 'Encodings not loaded'
        }), 500
    
    return jsonify({
        'status': 'healthy',
        'faces_loaded': len(encodings.get('encodings', [])),
        'known_people': list(set(encodings.get('names', [])))
    })

@app.route('/recognize', methods=['POST'])
def recognize():
    if encodings is None or len(encodings.get('encodings', [])) == 0:
        return jsonify({
            'success': False,
            'error': 'Model not loaded or no faces trained yet'
        }), 500
    
    try:
        # Check if image is provided
        if 'image' not in request.files:
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
        
        return jsonify({
            'success': True,
            'message': f'Image saved successfully',
            'image_count': image_count
        })
        
    except Exception as e:
        print(f"Error in enroll: {str(e)}")
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
        
        return jsonify({
            'success': True,
            'message': f'Training complete for {name}',
            'faces_added': faces_added,
            'total_faces': len(encodings_list)
        })
        
    except Exception as e:
        print(f"Error in train: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print(f"Starting server on port {os.environ.get('PORT', 8080)}")
    app.run(host='0.0.0.0', port=os.environ.get('PORT', 8080), debug=False)
