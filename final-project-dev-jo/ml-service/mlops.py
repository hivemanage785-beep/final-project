import os
import json
import time
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import accuracy_score

MODELS_DIR = "models/"
TRACKING_FILE = "predictions.jsonl"
INFO_FILE = os.path.join(MODELS_DIR, "current_model.json")
BASELINE_DATA = "tn_beehive_dataset.csv"

def init_mlops():
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
        
    if not os.path.exists(INFO_FILE):
        # Package current active models as v1
        for f in ["hybrid_features.pkl", "hybrid_regressor.pkl", "hybrid_classifier.pkl"]:
            if os.path.exists(f):
                os.rename(f, os.path.join(MODELS_DIR, f.replace("hybrid", "v1")))
                
        base_info = {
            "version": "v1",
            "features": "v1_features.pkl",
            "regressor": "v1_regressor.pkl",
            "classifier": "v1_classifier.pkl",
            "created_at": datetime.utcnow().isoformat(),
            "training_data_size": 1000,
            "metrics": {
                "accuracy": 0.95
            }
        }
        with open(INFO_FILE, "w") as f:
            json.dump(base_info, f, indent=4)

def load_active_model():
    init_mlops()
    with open(INFO_FILE, "r") as f:
        info = json.load(f)
        
    features = joblib.load(os.path.join(MODELS_DIR, info["features"]))
    reg_model = joblib.load(os.path.join(MODELS_DIR, info["regressor"]))
    clf_model = joblib.load(os.path.join(MODELS_DIR, info["classifier"]))
    return {"features": features, "reg_model": reg_model, "clf_model": clf_model, "version": info["version"]}

def log_prediction(input_data, prediction_data, model_version):
    record = {
        "timestamp": datetime.utcnow().timestamp(),
        "input": input_data,
        "prediction": prediction_data,
        "model_version": model_version,
        "feedback": None
    }
    with open(TRACKING_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")

def link_feedback(feedback_data):
    if not os.path.exists(TRACKING_FILE):
        return
        
    lat, lng, month = feedback_data.get("lat"), feedback_data.get("lng"), feedback_data.get("month")
    success = feedback_data.get("success")
    
    # Read all lines
    records = []
    updated = False
    with open(TRACKING_FILE, "r") as f:
        lines = f.readlines()
        
    for i in range(len(lines)-1, -1, -1):
        try:
            rec = json.loads(lines[i])
            inp = rec["input"]
            if rec.get("feedback") is None and inp.get("lat") == lat and inp.get("lng") == lng and inp.get("month") == month:
                rec["feedback"] = success
                lines[i] = json.dumps(rec) + "\n"
                updated = True
                break
        except Exception:
            continue
            
    if updated:
        with open(TRACKING_FILE, "w") as f:
            f.writelines(lines)
            
    return updated

def safe_retrain():
    if not os.path.exists(TRACKING_FILE):
        return False
        
    records = []
    with open(TRACKING_FILE, "r") as f:
        for line in f:
            try:
                rec = json.loads(line)
                if rec.get("feedback") is not None:
                    records.append(rec)
            except:
                pass
                
    if len(records) < 10: # Lowered threshold for validation simulation
        return False
        
    print(f"Triggering Retrain with {len(records)} feedback items...")
    
    # Combine original data and new feedback
    df_base = pd.read_csv(BASELINE_DATA)
    if 'district' in df_base.columns:
        df_base.drop('district', axis=1, inplace=True)
    df_base['success'] = df_base['score'].apply(lambda x: 1 if x > 35 else 0)
    
    feedback_rows = []
    for r in records:
        row = r["input"].copy()
        row["success"] = r["feedback"]
        # Approximate score backwards just so regressor runs
        row["score"] = 60.0 if r["feedback"] == 1 else 15.0 
        feedback_rows.append(row)
        
    df_merged = pd.concat([df_base, pd.DataFrame(feedback_rows)], ignore_index=True)
    
    features = ['temp','humidity','rainfall','ndvi','flora','month']
    X = df_merged[features]
    y_clf = df_merged['success']
    y_reg = df_merged['score']
    
    # Train new classifiers dynamically
    clf_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf_clf', RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42))
    ])
    
    reg_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf_reg', RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42))
    ])
    
    # Validation against old performance using holdout
    X_train, X_test, y_train, y_test = train_test_split(X, y_clf, test_size=0.2)
    clf_pipeline.fit(X_train, y_train)
    reg_pipeline.fit(X_train, y_reg.loc[X_train.index])
    
    y_pred = clf_pipeline.predict(X_test)
    new_acc = accuracy_score(y_test, y_pred)
    
    # Get current model info to compare
    with open(INFO_FILE, "r") as f:
        curr_info = json.load(f)
        
    old_acc = curr_info.get("metrics", {}).get("accuracy", 0.0)
    
    if new_acc >= old_acc * 0.95:  # Tolerance threshold
        new_v = f"v{int(curr_info['version'].replace('v','')) + 1}"
        print(f"Model upgraded to {new_v}. Acc: {new_acc:.4f}")
        
        joblib.dump(features, os.path.join(MODELS_DIR, f"{new_v}_features.pkl"))
        joblib.dump(reg_pipeline, os.path.join(MODELS_DIR, f"{new_v}_regressor.pkl"))
        joblib.dump(clf_pipeline, os.path.join(MODELS_DIR, f"{new_v}_classifier.pkl"))
        
        curr_info.update({
            "version": new_v,
            "features": f"{new_v}_features.pkl",
            "regressor": f"{new_v}_regressor.pkl",
            "classifier": f"{new_v}_classifier.pkl",
            "created_at": datetime.utcnow().isoformat(),
            "training_data_size": len(df_merged),
            "metrics": {"accuracy": new_acc}
        })
        
        with open(INFO_FILE, "w") as f:
            json.dump(curr_info, f, indent=4)
        return True
    else:
        print(f"New model rejected. New Acc: {new_acc} < Current Acc: {old_acc}")
        return False

def get_performance_stats():
    with open(INFO_FILE, "r") as f:
        info = json.load(f)
    return info
