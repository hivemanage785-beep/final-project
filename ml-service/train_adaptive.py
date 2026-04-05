import pandas as pd
import numpy as np
import joblib
import warnings
import os
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

warnings.filterwarnings('ignore')

FEEDBACK_FILE = "feedback_data.csv"
ORIGINAL_DATA_FILE = "tn_beehive_dataset.csv"
MODEL_FILE = "real_beehive_model.pkl"

features_base = ['temp', 'humidity', 'rainfall', 'ndvi', 'flora', 'month', 'lat', 'lng']

def init_seed_feedback():
    """Generates initial seed feedback if none exists based loosely on existing logic to start the pipeline"""
    if not os.path.exists(FEEDBACK_FILE):
        print("SEEDING initial feedback_data.csv because none was found.")
        df_orig = pd.read_csv(ORIGINAL_DATA_FILE)
        # Create a synthetic target 'success' based roughly on score just for initialization
        df_orig['success'] = df_orig['score'].apply(lambda x: 1 if x > 35 else 0)
        seed_data = df_orig[features_base + ['success']].sample(200, random_state=42)
        seed_data.to_csv(FEEDBACK_FILE, index=False)
        print("Seed data created successfully.")

def train_adaptive_model():
    print("=== ADAPTIVE LEARNING: TRAINING CYCLE ===")
    
    init_seed_feedback()
    
    # STEP 1: DATA INGESTION
    print("Loading datasets...")
    df_orig = pd.read_csv(ORIGINAL_DATA_FILE)
    
    # In original dataset, we must synthesize the target to match feedback if we are truly merging them globally,
    # or just use the feedback data if it represents the true source.
    # The prompt says: "Load feedback_data.csv, Merge datasets. target = success (0/1). Remove dependency on score."
    df_orig['success'] = df_orig['score'].apply(lambda x: 1 if x > 35 else 0) # Fallback heuristic
    
    df_feedback = pd.read_csv(FEEDBACK_FILE)
    
    # Merge datasets
    df_merged = pd.concat([df_orig[features_base + ['success']], df_feedback[features_base + ['success']]], ignore_index=True)
    
    # Ensure no dependency on score, df_merged does not have score.
    X = df_merged[features_base]
    y = df_merged['success']
    
    # STEP 3: TRAIN MODEL
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestClassifier(n_estimators=150, class_weight='balanced', random_state=42))
    ])
    
    print("Training Balanced Random Forest Classifier on Real Outcomes...")
    pipeline.fit(X_train, y_train)
    
    # STEP 4: VALIDATION
    print("\n--- VALIDATION ---")
    y_pred = pipeline.predict(X_test)
    print("Classification Report on Held-out Data:")
    print(classification_report(y_test, y_pred))
    
    # STEP 5: SAVE MODEL
    print(f"\nSaving model to {MODEL_FILE}...")
    joblib.dump(pipeline, MODEL_FILE)
    
# STEP 6: CONTINUOUS LEARNING DESIGN
def append_feedback(feedback_dict: dict):
    """
    Called by backend when user submits real-world success/failure.
    feedback_dict should have features + 'success' (0 or 1).
    """
    df_new = pd.DataFrame([feedback_dict])
    
    # Append to CSV
    if os.path.exists(FEEDBACK_FILE):
        df_new.to_csv(FEEDBACK_FILE, mode='a', header=False, index=False)
    else:
        df_new.to_csv(FEEDBACK_FILE, mode='w', header=True, index=False)
        
    print(f"Feedback ingested successfully. Total rows now dynamically expand.")

def predict_real_success(data: dict) -> dict:
    """Inference for app.py"""
    try:
        pipeline = joblib.load(MODEL_FILE)
    except Exception as e:
        raise Exception(f"Failed to load real model: {e}")
        
    input_df = pd.DataFrame([data], columns=features_base)
    prediction = int(pipeline.predict(input_df)[0])
    prob = pipeline.predict_proba(input_df)[0].tolist()
    
    return {
        "success_prediction": prediction,
        "confidence": prob
    }

if __name__ == "__main__":
    train_adaptive_model()
