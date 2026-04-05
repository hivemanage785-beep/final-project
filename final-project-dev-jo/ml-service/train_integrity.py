import pandas as pd
import numpy as np
import json
import joblib
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer

def train_integral_model():
    df = pd.read_csv("tn_beehive_dataset.csv")
    
    # 1. Feature Engineering
    # - Month mapping (Cyclic Trignometrics) avoiding hard integer thresholds
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12.0)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12.0)
    
    # Target conversion mapping success
    df['success'] = df['score'].apply(lambda x: 1 if x > 35 else 0)

    # 2. Geo Clustering / Avoid Lat-Lng leakage completely!
    # Cluster solely based on environmental parameters natively (finding natural geographic similarities)
    climate_features = ['temp', 'humidity', 'rainfall']
    kmeans = KMeans(n_clusters=4, random_state=42, n_init='auto')
    df['climate_zone'] = kmeans.fit_predict(df[climate_features])
    
    # Optional Trend Mocking to fit schema requirements locally if not present natively in static CSVs
    if 'ndvi_trend' not in df.columns:
        df['ndvi_trend'] = df['ndvi'].diff().fillna(0) # Basic mapping approximation

    # 3. Final Input Selections
    drop_cols = ['lat', 'lng', 'month', 'score', 'district', 'success']
    features = [c for c in df.columns if c not in drop_cols]
    
    X = df[features]
    y_clf = df['success']
    y_reg = df['score'] # Keep keeping continuous mappings

    print(f"Features used ({len(features)}): {features}")
    
    clf_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestClassifier(n_estimators=100, class_weight='balanced', max_depth=10, random_state=42))
    ])
    
    # 4. K-fold Validations mapping F1, Recall natively instead of flat accuracy
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scoring = ['accuracy', 'precision', 'recall', 'f1']
    cv_results = cross_validate(clf_pipeline, X, y_clf, cv=cv, scoring=scoring, return_estimator=True)
    
    rep = {
        "Accuracy (mean)": np.mean(cv_results['test_accuracy']),
        "Precision (mean)": np.mean(cv_results['test_precision']),
        "Recall (mean)": np.mean(cv_results['test_recall']),
        "F1 (mean)": np.mean(cv_results['test_f1'])
    }
    
    print("\n[VALIDATION REPORT]")
    for k, v in rep.items():
        print(f"{k}: {v:.4f}")
        
    # Fit overall model to output feature importances natively
    clf_pipeline.fit(X, y_clf)
    importances = clf_pipeline.named_steps['rf'].feature_importances_
    
    print("\n[FEATURE IMPORTANCES]")
    is_dominant = False
    for f, imp in zip(features, importances):
        print(f"{f}: {imp:.4f}")
        if imp > 0.40:
            print(f" -> ⚠️ DOMINANT FEATURE RISK: {f} exceeds 40% control ratio.")
            is_dominant = True
            
    if not is_dominant:
        print("✅ Feature Importance evenly distributed without extreme domination.")

    # Dump pipeline
    joblib.dump(features, "models/v3_features.pkl")
    joblib.dump(clf_pipeline, "models/v3_classifier.pkl")
    joblib.dump(kmeans, "models/v3_climate_cluster.pkl")
    
    # Dummy Regressor update
    reg_pipeline = Pipeline([('scaler', StandardScaler()), ('rf', RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42))])
    reg_pipeline.fit(X, y_reg)
    joblib.dump(reg_pipeline, "models/v3_regressor.pkl")

if __name__ == '__main__':
    train_integral_model()
