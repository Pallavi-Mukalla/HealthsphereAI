import sys
import json
import joblib
import pandas as pd
import numpy as np
import os

# -----------------------------
# Paths
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "stacked_disease_model_v2.pkl")  # your locally saved model

# -----------------------------
# Load Model
# -----------------------------
try:
    saved_model = joblib.load(MODEL_PATH)

    extra_model = saved_model.get("extra_model")
    xgb_model = saved_model.get("xgb_model")
    meta_model = saved_model.get("meta_model")
    label_encoder = saved_model.get("label_encoder")

    # Make sure all models exist
    if not all([extra_model, xgb_model, meta_model, label_encoder]):
        raise ValueError("One or more models are missing in the saved file.")

except Exception as e:
    print(json.dumps({"error": f"Model loading failed: {str(e)}"}))
    sys.exit(1)

# -----------------------------
# Get Input Symptoms
# -----------------------------
try:
    input_symptoms = json.loads(sys.argv[1])
    if not isinstance(input_symptoms, list):
        raise ValueError("Input must be a list of symptoms")
except Exception as e:
    print(json.dumps({"error": f"Invalid input: {str(e)}"}))
    sys.exit(1)

# -----------------------------
# Normalize Input
# -----------------------------
input_symptoms = [s.lower().strip().replace(" ", "_") for s in input_symptoms]

# -----------------------------
# Create Feature Vector
# -----------------------------
try:
    all_features = extra_model.feature_names_in_  # get feature names from ExtraTrees
    feature_dict = {f: 0 for f in all_features}

    matched_symptoms = []
    for symptom in input_symptoms:
        if symptom in feature_dict:
            feature_dict[symptom] = 1
            matched_symptoms.append(symptom)

    if not matched_symptoms:
        raise ValueError("None of the input symptoms are recognized")

    input_df = pd.DataFrame([feature_dict])
    input_selected = input_df.reindex(columns=all_features, fill_value=0)

except Exception as e:
    print(json.dumps({"error": f"Feature processing failed: {str(e)}"}))
    sys.exit(1)

# -----------------------------
# Predict Disease
# -----------------------------
try:
    extra_pred = extra_model.predict_proba(input_selected)
    xgb_pred = xgb_model.predict_proba(input_selected)

    # Combine predictions for meta model
    stack_input = np.hstack((extra_pred, xgb_pred))
    final_pred = meta_model.predict(stack_input)

    predicted_label = label_encoder.inverse_transform(final_pred)[0]

    print(json.dumps({
        "prediction": predicted_label,
        "matched_symptoms": matched_symptoms
    }))

except Exception as e:
    print(json.dumps({"error": f"Prediction failed: {str(e)}"}))
    sys.exit(1)
