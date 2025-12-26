"""
Script to train the disease prediction model
This should be run to create/update the ML model
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import pickle
import json
from pathlib import Path
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

def load_data_from_mongodb():
    """Load symptom to disease mapping from MongoDB"""
    client = MongoClient(os.getenv("MONGODB_CONNECTION_STRING"))
    db = client.get_database()
    
    # Load from symptomtodiseasemapping collection
    collection = db['symptomtodiseasemapping']
    data = list(collection.find())
    
    client.close()
    return data

def prepare_training_data(mapping_data):
    """Prepare training data from MongoDB mapping"""
    # This is a simplified example - adjust based on your actual data structure
    symptoms_list = []
    diseases_list = []
    
    for record in mapping_data:
        # Adjust based on your actual MongoDB document structure
        symptoms = record.get('symptoms', [])
        disease = record.get('disease', '')
        
        if symptoms and disease:
            symptoms_list.append(symptoms)
            diseases_list.append(disease)
    
    return symptoms_list, diseases_list

def train_model():
    """Train the disease prediction model"""
    print("Loading data from MongoDB...")
    mapping_data = load_data_from_mongodb()
    
    if not mapping_data:
        print("No data found in MongoDB. Creating sample model...")
        # Create a simple sample model
        create_sample_model()
        return
    
    print("Preparing training data...")
    symptoms_list, diseases_list = prepare_training_data(mapping_data)
    
    if not symptoms_list:
        print("No valid training data. Creating sample model...")
        create_sample_model()
        return
    
    # Create symptom vocabulary
    all_symptoms = set()
    for symptoms in symptoms_list:
        all_symptoms.update(symptoms)
    all_symptoms = sorted(list(all_symptoms))
    
    # Convert to feature vectors
    X = []
    y = []
    
    for symptoms, disease in zip(symptoms_list, diseases_list):
        feature_vector = [1 if symptom in symptoms else 0 for symptom in all_symptoms]
        X.append(feature_vector)
        y.append(disease)
    
    X = np.array(X)
    y = np.array(y)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train model
    print("Training model...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    score = model.score(X_test, y_test)
    print(f"Model accuracy: {score:.2%}")
    
    # Save model
    models_dir = Path(__file__).parent / "models"
    models_dir.mkdir(exist_ok=True)
    
    model_path = models_dir / "disease_model.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"Model saved to {model_path}")
    
    # Save symptom mapping
    symptom_mapping = {symptom: [] for symptom in all_symptoms}
    for symptoms, disease in zip(symptoms_list, diseases_list):
        for symptom in symptoms:
            if disease not in symptom_mapping[symptom]:
                symptom_mapping[symptom].append(disease)
    
    mapping_path = models_dir / "symptom_mapping.json"
    with open(mapping_path, 'w') as f:
        json.dump(symptom_mapping, f, indent=2)
    print(f"Symptom mapping saved to {mapping_path}")

def create_sample_model():
    """Create a sample model for testing"""
    models_dir = Path(__file__).parent / "models"
    models_dir.mkdir(exist_ok=True)
    
    # Create simple symptom mapping
    symptom_mapping = {
        "headache": ["migraine", "tension_headache"],
        "fever": ["flu", "infection"],
        "cough": ["cold", "bronchitis"],
        "chest_pain": ["heart_disease", "angina"],
        "shortness_of_breath": ["asthma", "copd"]
    }
    
    mapping_path = models_dir / "symptom_mapping.json"
    with open(mapping_path, 'w') as f:
        json.dump(symptom_mapping, f, indent=2)
    print(f"Sample symptom mapping created at {mapping_path}")

if __name__ == "__main__":
    train_model()

