"""
ML Service for Disease Prediction
Runs as a separate Python service that the Node.js backend calls
"""
import pickle
import numpy as np
import sys
import json
from pathlib import Path

# Load the trained model (if exists)
MODEL_PATH = Path(__file__).parent / "models" / "disease_model.pkl"
SYMPTOM_MAPPING_PATH = Path(__file__).parent / "models" / "symptom_mapping.json"

class DiseasePredictor:
    def __init__(self):
        self.model = None
        self.symptom_mapping = {}
        self.load_model()
        self.load_symptom_mapping()
    
    def load_model(self):
        """Load trained ML model"""
        try:
            if MODEL_PATH.exists():
                with open(MODEL_PATH, 'rb') as f:
                    self.model = pickle.load(f)
        except Exception as e:
            print(f"Warning: Could not load model: {e}", file=sys.stderr)
    
    def load_symptom_mapping(self):
        """Load symptom to disease mapping"""
        try:
            if SYMPTOM_MAPPING_PATH.exists():
                with open(SYMPTOM_MAPPING_PATH, 'r') as f:
                    self.symptom_mapping = json.load(f)
        except Exception as e:
            print(f"Warning: Could not load symptom mapping: {e}", file=sys.stderr)
    
    def predict(self, symptoms):
        """
        Predict disease from symptoms
        
        Args:
            symptoms: List of symptom strings
        
        Returns:
            Disease name or None
        """
        if not symptoms or len(symptoms) == 0:
            return None
        
        # If model exists, use it
        if self.model:
            try:
                # Convert symptoms to feature vector
                features = self.symptoms_to_features(symptoms)
                if features is not None:
                    prediction = self.model.predict([features])[0]
                    return prediction
            except Exception as e:
                print(f"Model prediction error: {e}", file=sys.stderr)
        
        # Fallback: Use symptom mapping
        if self.symptom_mapping:
            return self.predict_from_mapping(symptoms)
        
        return None
    
    def symptoms_to_features(self, symptoms):
        """Convert symptoms list to feature vector"""
        # This is a simplified version - adjust based on your model's requirements
        # You'll need to match your model's expected feature format
        try:
            # Create a binary vector for symptoms
            all_symptoms = list(self.symptom_mapping.keys()) if self.symptom_mapping else []
            if not all_symptoms:
                return None
            
            features = np.zeros(len(all_symptoms))
            for symptom in symptoms:
                symptom_lower = symptom.lower().replace('_', ' ')
                for idx, mapped_symptom in enumerate(all_symptoms):
                    if symptom_lower in mapped_symptom.lower() or mapped_symptom.lower() in symptom_lower:
                        features[idx] = 1.0
                        break
            
            return features
        except Exception as e:
            print(f"Feature conversion error: {e}", file=sys.stderr)
            return None
    
    def predict_from_mapping(self, symptoms):
        """Predict disease using symptom mapping"""
        disease_scores = {}
        
        for symptom in symptoms:
            symptom_lower = symptom.lower().replace('_', ' ')
            for mapped_symptom, diseases in self.symptom_mapping.items():
                if symptom_lower in mapped_symptom.lower() or mapped_symptom.lower() in symptom_lower:
                    for disease in diseases:
                        disease_scores[disease] = disease_scores.get(disease, 0) + 1
        
        if disease_scores:
            return max(disease_scores, key=disease_scores.get)
        
        return None


def main():
    """Main function for command-line usage"""
    if len(sys.argv) < 2:
        print("Usage: python disease_predictor.py <symptoms_json>")
        sys.exit(1)
    
    try:
        symptoms = json.loads(sys.argv[1])
        predictor = DiseasePredictor()
        disease = predictor.predict(symptoms)
        
        result = {"disease": disease} if disease else {"disease": None}
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

