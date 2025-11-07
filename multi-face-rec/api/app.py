from flask import Flask, request, jsonify
import face_recognition
import pickle
import numpy as np
from PIL import Image
import os

app = Flask(__name__)

# Load encodings at startup
encodings_path = os.path.join(os.path.dirname(__file__), '..', 'encodings.pkl')

print(f"Loading face encodings from: {encodings_path}")
try:
    with open(encodings_path, "rb") as f:
        encodings = pickle.load(f)
    print(f"✅ Loaded {len(encodings['encodings'])} face encodings")
    print(f"✅ Known people: {set(encodings['names'])}")
except Exception as e:
    print(f"❌ Error loading encodings: {e}")
    encodings = None

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'name': 'Face Recognition API',
        'version': '1.0',
        'status': 'healthy' if encodings else 'unhealthy',
        'endpoints': {
            '/': 'GET - API info',
            '/health': 'GET - Health check',
            '/recognize': 'POST - Recognize faces (multipart/form-data with "image" field)'
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
