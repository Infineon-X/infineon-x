import face_recognition
import pickle
from pathlib import Path
import cv2
import numpy as np
from datetime import datetime

def recognize_faces_with_boxes(image_path, output_path=None, show_debug=True):
    """Recognize faces and draw bounding boxes with labels"""
    
    # Load saved encodings
    with open("encodings.pkl", "rb") as f:
        loaded_encodings = pickle.load(f)
    
    if show_debug:
        print(f"\n{'='*50}")
        print(f"FACE RECOGNITION DEBUG - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*50}")
        print(f"Loaded {len(loaded_encodings['encodings'])} face encodings")
        print(f"Known people: {set(loaded_encodings['names'])}")
        print(f"Analyzing image: {image_path}\n")
    
    # Load image with face_recognition (RGB)
    image = face_recognition.load_image_file(image_path)
    
    # Convert to BGR for OpenCV
    image_cv = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    # Detect faces
    face_locations = face_recognition.face_locations(image)
    face_encodings = face_recognition.face_encodings(image, face_locations)
    
    if show_debug:
        print(f"Found {len(face_encodings)} face(s) in the image\n")
    
    # Process each detected face
    for i, (face_encoding, face_location) in enumerate(zip(face_encodings, face_locations)):
        # Get face location coordinates
        top, right, bottom, left = face_location
        
        # Compare with known faces
        matches = face_recognition.compare_faces(
            loaded_encodings["encodings"], 
            face_encoding,
            tolerance=0.6
        )
        
        # Calculate face distances
        face_distances = face_recognition.face_distance(
            loaded_encodings["encodings"], 
            face_encoding
        )
        
        # Find best match
        name = "Unknown"
        confidence = 0
        
        if True in matches:
            best_match_index = np.argmin(face_distances)
            if matches[best_match_index]:
                name = loaded_encodings["names"][best_match_index]
                confidence = (1 - face_distances[best_match_index]) * 100
        
        # Debug output
        if show_debug:
            print(f"Face {i+1}:")
            print(f"  - Location: Top={top}, Right={right}, Bottom={bottom}, Left={left}")
            print(f"  - Identified as: {name}")
            print(f"  - Confidence: {confidence:.2f}%")
            if len(face_distances) > 0:
                print(f"  - Best distance: {face_distances[best_match_index]:.4f}")
            print()
        
        # Draw rectangle around face
        color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
        thickness = 3
        cv2.rectangle(image_cv, (left, top), (right, bottom), color, thickness)
        
        # Draw label background
        label_height = 40
        cv2.rectangle(image_cv, (left, bottom), (right, bottom + label_height), color, cv2.FILLED)
        
        # Put text
        font = cv2.FONT_HERSHEY_DUPLEX
        label = f"{name} ({confidence:.1f}%)"
        cv2.putText(image_cv, label, (left + 10, bottom + 28), font, 0.7, (255, 255, 255), 2)
    
    # Save output image if path provided
    if output_path:
        cv2.imwrite(output_path, image_cv)
        if show_debug:
            print(f"\n✅ Output saved to: {output_path}")
    
    # Display image
    # print("\n📺 Displaying image (press any key to close)...")
    # cv2.imshow("Face Recognition Results", image_cv)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    
    return len(face_encodings)

if __name__ == "__main__":
    # Process test images
    import sys
    
    for i in range(3):
        test_image = f"test_images/test{i}.jpg"
        output_image = f"test_images/test{i}_output.jpg"
        print(f"\n=== Processing: {test_image} ===")
        recognize_faces_with_boxes(test_image, output_image, show_debug=True)
    test_image = "test_images/a.jpeg"
    output_image = "test_images/a_output.jpeg"
    recognize_faces_with_boxes(test_image, output_image, show_debug=True)
