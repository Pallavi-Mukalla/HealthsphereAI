# ml_service/diseasePredictor.py

import sys
import json
import pickle
import numpy as np
import os

# -----------------------------
# Paths
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "disease_model.pkl")
MAPPING_PATH = os.path.join(BASE_DIR, "models", "symptom_mapping.json")

# -----------------------------
# Main Function
# -----------------------------
def main():
    try:
        # Load Model & Mapping
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)

        with open(MAPPING_PATH, "r") as f:
            symptom_mapping = json.load(f)

    except Exception as e:
        print(json.dumps({"error": f"Failed to load model or mapping: {str(e)}"}))
        sys.exit(1)

    try:
        # Read Symptoms from CLI (JSON string)
        input_symptoms = json.loads(sys.argv[1])

        if not isinstance(input_symptoms, list):
            raise ValueError("Symptoms must be provided as a list.")

        # Normalize symptoms
        input_symptoms = [s.lower().strip() for s in input_symptoms]

    except Exception as e:
        print(json.dumps({"error": f"Invalid input: {str(e)}"}))
        sys.exit(1)

    # -----------------------------
    # Create Feature Vector
    # -----------------------------
    num_features = len(symptom_mapping)
    X = np.zeros((1, num_features), dtype=int)

    matched_symptoms = []
    for symptom in input_symptoms:
        if symptom in symptom_mapping:
            idx = symptom_mapping[symptom]
            X[0, idx] = 1
            matched_symptoms.append(symptom)

    if not matched_symptoms:
        print(json.dumps({"error": "None of the input symptoms are recognized."}))
        sys.exit(1)

    # -----------------------------
    # Predict Disease
    # -----------------------------
    try:
        if hasattr(model, "predict_proba"):
            # If model supports probabilities
            probs = model.predict_proba(X)[0]
            top_idx = np.argmax(probs)
            disease = model.classes_[top_idx]
            confidence = float(probs[top_idx])
            print(json.dumps({"disease": disease, "confidence": confidence}))
        else:
            # Default prediction
            disease = model.predict(X)[0]
            print(json.dumps({"disease": disease}))

    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {str(e)}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
