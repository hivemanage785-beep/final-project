import pandas as pd
import numpy as np
import joblib
import warnings
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
import os

warnings.filterwarnings('ignore')

dataset_file = "tn_beehive_dataset.csv"

def evaluate_and_train():
    print("--- HYBRID MODEL TRAINING ---")
    df = pd.read_csv(dataset_file)
    if 'district' in df.columns:
        df.drop('district', axis=1, inplace=True)
        
    features = ['temp','humidity','rainfall','ndvi','flora','month','lat','lng']

    # 1. Test Feature Dominance
    print("Testing Feature Dominance...")
    X_test_dom = df[features]
    y_test_dom = df['score']
    rf_test = RandomForestRegressor(n_estimators=50, random_state=42)
    rf_test.fit(X_test_dom, y_test_dom)
    
    importances = rf_test.feature_importances_
    dom_dict = dict(zip(features, importances))
    print(f"Lat dominance: {dom_dict['lat']:.4f}, Lng dominance: {dom_dict['lng']:.4f}")
    
    if dom_dict['lat'] > 0.20 or dom_dict['lng'] > 0.20:
        print("Lat/Lng dominate! Dropping them.")
        features = ['temp','humidity','rainfall','ndvi','flora','month']
    else:
        print("Lat/Lng do within limits (<20%). Keeping them.")
        
    print(f"Final features: {features}")
    
    # 2. Train Regressor (predicts continuous score)
    print("Training Regressor...")
    X = df[features]
    y_reg = df['score']
    
    reg_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf_reg', RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42))
    ])
    reg_pipeline.fit(X, y_reg)
    joblib.dump(reg_pipeline, "hybrid_regressor.pkl")
    
    # 3. Train Classifier (predicts success 0/1)
    print("Training Classifier...")
    # Derive success if not provided
    y_clf = df['score'].apply(lambda x: 1 if x > 35 else 0)
    
    clf_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf_clf', RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42))
    ])
    clf_pipeline.fit(X, y_clf)
    joblib.dump(clf_pipeline, "hybrid_classifier.pkl")
    
    # Save feature schema
    joblib.dump(features, "hybrid_features.pkl")
    
    print("Hybrid models saved.")

def predict_hybrid(data: dict) -> dict:
    features = joblib.load("hybrid_features.pkl")
    reg_model = joblib.load("hybrid_regressor.pkl")
    clf_model = joblib.load("hybrid_classifier.pkl")
    
    input_df = pd.DataFrame([data], columns=features)
    
    predicted_score = reg_model.predict(input_df)[0]
    
    probs = clf_model.predict_proba(input_df)[0]
    success_probability = probs[1] # Probability of class 1
    
    # HYBRID SCORING
    final_score = (0.6 * predicted_score) + (0.4 * success_probability * 100)
    
    # RISK CONVERSION
    if final_score < 30:
        risk = 0
    elif final_score <= 45:
        risk = 1
    else:
        risk = 2
        
    return {
        "score": round(float(final_score), 2),
        "risk": risk,
        "confidence": round(float(success_probability), 4)
    }

if __name__ == "__main__":
    evaluate_and_train()
    
    # Validation tests
    print("\n--- VALIDATION ---")
    bad = {"temp": 45, "humidity": 20, "rainfall": 0, "ndvi": 0.1, "flora": 1, "month": 6, "lat": 11.0, "lng": 78.0}
    good = {"temp": 26, "humidity": 65, "rainfall": 60, "ndvi": 0.8, "flora": 8, "month": 6, "lat": 11.0, "lng": 78.0}
    
    print("Bad:", predict_hybrid(bad))
    print("Good:", predict_hybrid(good))
