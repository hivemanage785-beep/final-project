import pandas as pd
import numpy as np
import joblib
import warnings
import json
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

warnings.filterwarnings('ignore')

def train_regression_model():
    print("=== STARTING REGRESSION TRAINING ===")
    
    # STEP 1: LOAD DATA
    df = pd.read_csv("tn_beehive_dataset.csv")
    if 'district' in df.columns:
        df.drop('district', axis=1, inplace=True)
    
    # STEP 2 & 3: TARGET CHANGE & FEATURES
    features = ['temp','humidity','rainfall','ndvi','flora','month','lat','lng']
    target = 'score'
    
    X = df[features]
    y = df[target]
    
    # STEP 4: TRAIN MODEL
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42))
    ])
    
    print("Training Regressor...")
    pipeline.fit(X_train, y_train)
    
    # STEP 5: EVALUATE
    y_pred = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    # Check Cross-validation
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring='neg_mean_absolute_error')
    cv_mae = -cv_scores.mean()
    
    with open("regression_report.txt", "w") as f:
        f.write(f"--- EVALUATION METRICS ---\n")
        f.write(f"Test MAE: {mae:.2f}\n")
        f.write(f"Test R2 Score: {r2:.4f}\n")
        f.write(f"CV MAE: {cv_mae:.2f}\n")
        
        # STEP 8: VALIDATION
        f.write(f"\n--- VALIDATION TESTS ---\n")
        bad_cond = [45, 20, 0, 0.1, 1, 6, 11.0, 78.0]
        good_cond = [26, 65, 60, 0.8, 8, 6, 11.0, 78.0]
        
        bad_score = pipeline.predict(pd.DataFrame([bad_cond], columns=features))[0]
        good_score = pipeline.predict(pd.DataFrame([good_cond], columns=features))[0]
        
        f.write(f"Bad Conditions (Exp Low): Score={bad_score:.2f} -> Risk={convert_to_risk(bad_score)}\n")
        f.write(f"Good Conditions (Exp High): Score={good_score:.2f} -> Risk={convert_to_risk(good_score)}\n")

    # STEP 9: SAVE MODEL
    joblib.dump(pipeline, "beehive_model.pkl")

# STEP 6: INFERENCE FUNCTION
def predict_score(data: dict) -> float:
    try:
        pipeline = joblib.load("beehive_model.pkl")
    except Exception as e:
        raise Exception(f"Failed to load mode: {e}")
        
    features_order = ['temp','humidity','rainfall','ndvi','flora','month','lat','lng']
    input_df = pd.DataFrame([data], columns=features_order)
    score = pipeline.predict(input_df)[0]
    return float(score)

# STEP 7: RISK CONVERSION
def convert_to_risk(score: float) -> int:
    if score < 30:
        return 0
    elif score <= 45:
        return 1
    else:
        return 2

if __name__ == "__main__":
    train_regression_model()
    print("Done")
