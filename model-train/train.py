import face_recognition
from pathlib import Path
import pickle
import os
import csv

FOLDER_CSV = "trained_folders.csv"
ENCODINGS_PATH = os.path.join("..", "deploy", "encodings.pkl")


def load_trained_folders(csv_path=FOLDER_CSV):
    trained = set()
    if os.path.exists(csv_path):
        with open(csv_path, newline="") as csvfile:
            reader = csv.reader(csvfile)
            for row in reader:
                if row:
                    trained.add(row[0])
    return trained


def save_trained_folders(trained, csv_path=FOLDER_CSV):
    with open(csv_path, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        for folder in sorted(trained):
            writer.writerow([folder])


def train_faces(incremental=True):
    """Train faces and skip folders (people) already trained before."""

    # Load model if exists
    if incremental and os.path.exists(ENCODINGS_PATH):
        print("Loading existing encodings...")
        with open(ENCODINGS_PATH, "rb") as f:
            data = pickle.load(f)
            names = data["names"]
            encodings = data["encodings"]
        print(f"Loaded {len(encodings)} known faces.")
    else:
        print("Starting fresh training...")
        names, encodings = [], []

    # Load which folders (names) are already trained
    trained_folders = load_trained_folders()
    print(f"Already trained folders: {trained_folders or 'None'}")

    training_root = Path("training")
    new_folders = [p for p in training_root.iterdir() if p.is_dir() and p.name not in trained_folders]

    if not new_folders:
        print("No new folders to train. Everything is up to date.")
        return

    for folder in new_folders:
        person_name = folder.name
        print(f"\nTraining new folder: {person_name}")

        for fp in folder.glob("*"):
            if fp.is_file():
                img = face_recognition.load_image_file(fp)
                locs = face_recognition.face_locations(img, model="hog")  # Use "cnn" if GPU is available
                codes = face_recognition.face_encodings(img, locs)
                for code in codes:
                    names.append(person_name)
                    encodings.append(code)

        trained_folders.add(person_name)
        print(f"Trained folder '{person_name}' with {len(list(folder.glob('*')))} images.")

    # Ensure the deploy directory exists
    deploy_dir = os.path.dirname(ENCODINGS_PATH)
    os.makedirs(deploy_dir, exist_ok=True)

    # Save updated encodings
    out = {"names": names, "encodings": encodings}
    with open(ENCODINGS_PATH, "wb") as f:
        pickle.dump(out, f)
    print(f"✅ Updated model saved as {ENCODINGS_PATH}")

    # Save updated trained folder list
    save_trained_folders(trained_folders)
    print(f"✅ Updated folder list saved in {FOLDER_CSV}")


if __name__ == "__main__":
    train_faces(incremental=True)
