# ml_service/train_disease_model.py
import os
import json
import pickle
import numpy as np
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from dotenv import load_dotenv
load_dotenv()
# -----------------------------
# MongoDB Config
# -----------------------------
MONGO_URI = os.getenv("MONGODB_CONNECTION_STRING")
DB_NAME = "documents"
COLLECTION_NAME = "symptomtodiseasemapping"

if not MONGO_URI:
    raise ValueError("Please set MONGODB_CONNECTION_STRING in your .env file")

# -----------------------------
# Connect to MongoDB
# -----------------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# -----------------------------
# Load data from MongoDB
# -----------------------------
documents = list(collection.find({}))
if not documents:
    raise ValueError("No documents found in MongoDB collection")

# Convert to DataFrame
df = pd.DataFrame(documents)

# Remove MongoDB internal _id if exists
if "_id" in df.columns:
    df = df.drop(columns=["_id"])

# -----------------------------
# Identify symptom columns
# -----------------------------
# Assuming 'disease' is the target
target_column = "disease"
symptom_columns = [col for col in df.columns if col != target_column and col != "source_file"]

# Fill missing values and ensure numeric
X = df[symptom_columns].fillna(0).astype(int).values
y = df[target_column].values

# -----------------------------
# Train/Test Split
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# -----------------------------
# Train Model
# -----------------------------
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# -----------------------------
# Test Accuracy
# -----------------------------
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"Model trained with accuracy: {acc:.2f}")

# -----------------------------
# Save Model
# -----------------------------
os.makedirs("ml_service/models", exist_ok=True)
with open("ml_service/models/disease_model.pkl", "wb") as f:
    pickle.dump(model, f)
print("Model saved to ml_service/models/disease_model.pkl")

# -----------------------------
# Save Symptom Mapping
# -----------------------------
# Create mapping: symptom name -> column index
symptom_mapping = {symptom: idx for idx, symptom in enumerate(symptom_columns)}
with open("ml_service/models/symptom_mapping.json", "w") as f:
    json.dump(symptom_mapping, f, indent=4)
print("Symptom mapping saved to ml_service/models/symptom_mapping.json")
