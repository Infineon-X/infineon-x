import face_recognition
import pickle
import cv2
import numpy as np
from datetime import datetime


def realtime_face_recognition():
    """Real-time face recognition from webcam"""
    
    # Load encodings
    print("Loading face encodings...")
    with open("encodings.pkl", "rb") as f:
        loaded_encodings = pickle.load(f)
    
    print(f"Loaded {len(loaded_encodings['encodings'])} encodings")
    print(f"Known people: {set(loaded_encodings['names'])}")
    
    # Open webcam
    video_capture = cv2.VideoCapture(0)
    
    if not video_capture.isOpened():
        print("Error: Could not open webcam")
        return
    
    print("\nStarting real-time face recognition...")
    print("Press 'q' to quit, 'd' to toggle debug info")
    
    show_debug = True
    frame_count = 0
    process_every_n_frames = 3  # Process every 3rd frame for performance
    
    # Store last detected faces to avoid blinking
    last_face_data = []
    
    while True:
        ret, frame = video_capture.read()
        if not ret:
            break
        
        frame_count += 1
        
        # Process every Nth frame for performance
        if frame_count % process_every_n_frames == 0:
            # Resize frame for faster processing
            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            
            # Find faces
            face_locations = face_recognition.face_locations(rgb_small_frame)
            face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
            
            # Clear and rebuild face data
            last_face_data = []
            
            # Process each face
            for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
                # Scale back up face locations
                top *= 4
                right *= 4
                bottom *= 4
                left *= 4
                
                # Match faces
                matches = face_recognition.compare_faces(
                    loaded_encodings["encodings"], 
                    face_encoding,
                    tolerance=0.6
                )
                
                name = "Unknown"
                confidence = 0
                
                if True in matches:
                    face_distances = face_recognition.face_distance(
                        loaded_encodings["encodings"], 
                        face_encoding
                    )
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index]:
                        name = loaded_encodings["names"][best_match_index]
                        confidence = (1 - face_distances[best_match_index]) * 100
                
                # Store face data for continuous display
                last_face_data.append({
                    'location': (top, right, bottom, left),
                    'name': name,
                    'confidence': confidence
                })
        
        # Draw all faces from last detection (prevents blinking)
        for face_data in last_face_data:
            top, right, bottom, left = face_data['location']
            name = face_data['name']
            confidence = face_data['confidence']
            
            # Draw box and label
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            cv2.rectangle(frame, (left, top), (right, bottom), color, 3)
            
            # Draw label background with more height
            label_height = 40
            cv2.rectangle(frame, (left, bottom), (right, bottom + label_height), color, cv2.FILLED)
            
            # Put text with better visibility
            label = f"{name} ({confidence:.1f}%)"
            cv2.putText(frame, label, (left + 8, bottom + 28), 
                       cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 255), 2)
        
        # Debug info on frame
        if show_debug:
            debug_text = f"Faces: {len(last_face_data)} | Frame: {frame_count}"
            cv2.putText(frame, debug_text, (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        
        # Display frame
        cv2.imshow('Real-time Face Recognition', frame)
        
        # Handle key presses
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('d'):
            show_debug = not show_debug
    
    # Cleanup
    video_capture.release()
    cv2.destroyAllWindows()
    print("\nStopped real-time recognition")


if __name__ == "__main__":
    realtime_face_recognition()
