import pandas as pd
import numpy as np
import joblib
import json
import warnings
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

warnings.filterwarnings('ignore')

def train_pipeline():
    # STEP 1 - LOAD AND VALIDATE DATA
    df = pd.read_csv("tn_beehive_dataset.csv")
    print("--- STEP 1: Load and Validate Data ---")
    print(df.head())
    print(df.info())
    print(df.describe())
    
    expected_cols = ['lat','lng','month','temp','humidity','rainfall','ndvi','flora','score']
    for col in expected_cols:
        assert col in df.columns, f"Missing column: {col}"
        
    if 'district' in df.columns:
        df.drop('district', axis=1, inplace=True)
        print("Dropped 'district' column.")

    # STEP 2 - DATA-DRIVEN TARGET CREATION
    print("\n--- STEP 2: Target Creation ---")
    q1 = df['score'].quantile(0.33)
    q2 = df['score'].quantile(0.66)
    
    def get_target(score):
        if score < q1:
            return 0
        elif score < q2:
            return 1
        else:
            return 2
            
    df['target'] = df['score'].apply(get_target)
    print("Class distribution:\n", df['target'].value_counts())
    assert len(df['target'].unique()) == 3, "Missing classes in target."
    
    # STEP 3 - FEATURE SELECTION
    print("\n--- STEP 3: Feature Selection ---")
    # lat/lng removed to prevent spatial leakage (per codebase audit)
    features = ['temp','humidity','rainfall','ndvi','flora','month']
    target = 'target'
    
    X = df[features]
    y = df[target]
    
    assert X.isnull().sum().sum() == 0, "Missing values found in features."
    print("Feature data types:\n", X.dtypes)
    
    # STEP 4 - TRAIN TEST SPLIT
    print("\n--- STEP 4: Train Test Split ---")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # STEP 5 - PIPELINE
    print("\n--- STEP 5: Pipeline ---")
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestClassifier(n_estimators=200, max_depth=10, class_weight='balanced', random_state=42))
    ])
    
    # STEP 6 - CROSS VALIDATION
    print("\n--- STEP 6: Cross Validation ---")
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, n_jobs=-1)
    print(f"5-Fold CV Mean Accuracy: {cv_scores.mean():.4f}")
    
    # STEP 7 - MODEL TRAINING
    print("\n--- STEP 7: Model Training ---")
    pipeline.fit(X_train, y_train)
    
    # STEP 8 - MODEL EVALUATION
    print("\n--- STEP 8: Model Evaluation ---")
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}")
    print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
    print("Classification Report:\n", classification_report(y_test, y_pred))
    
    unique_classes_pred = set(y_pred)
    if len(unique_classes_pred) < 3:
        warnings.warn(f"Missing classes in predictions! Predicted classes: {unique_classes_pred}")
        
    # STEP 9 - FEATURE IMPORTANCE
    print("\n--- STEP 9: Feature Importance ---")
    rf_model = pipeline.named_steps['rf']
    importances = rf_model.feature_importances_
    feat_imps = pd.DataFrame({'feature': features, 'importance': importances})
    feat_imps = feat_imps.sort_values(by='importance', ascending=False)
    print("Top Features:\n", feat_imps)

    # SEC AUDIT: No dominant feature > 40%
    max_imp = feat_imps['importance'].max()
    max_feat = feat_imps.iloc[0]['feature']
    if max_imp > 0.40:
        raise ValueError(f"CRITICAL: Feature '{max_feat}' has {max_imp:.2%} importance. Domination limit (40%) exceeded. Possible data leakage.")
    
    # STEP 10 - CONFIDENCE OUTPUT
    print("\n--- STEP 10: Confidence Output ---")
    sample_indices = X_test.head(5).index
    sample_preds = pipeline.predict(X_test.head(5))
    sample_probs = pipeline.predict_proba(X_test.head(5))
    for i, (pred, prob) in enumerate(zip(sample_preds, sample_probs)):
        print(f"Sample {i+1} -> Predicted Class: {pred}, Confidence: {prob}")
        
    # STEP 11 - SAVE MODEL
    print("\n--- STEP 11: Save Model ---")
    joblib.dump(pipeline, "beehive_model.pkl")
    # Save features list separately for inference consistency
    joblib.dump(features, "features.pkl")
    print("Saved pipeline to beehive_model.pkl and features to features.pkl")

# STEP 12 & 13 - INFERENCE FUNCTION
def predict_beehive(data: dict):
    model_path = "beehive_model.pkl"
    feat_path = "features.pkl"
    try:
        pipeline = joblib.load(model_path)
        features_order = joblib.load(feat_path)
    except Exception as e:
        return {"error": str(e)}
        
    input_df = pd.DataFrame([data], columns=features_order)
    
    # Handle missing features (e.g. ndvi) gracefully
    input_df = input_df.fillna(input_df.mean()) 
    
    prediction = int(pipeline.predict(input_df)[0])
    probabilities = pipeline.predict_proba(input_df)[0].tolist()
    
    return {
        "prediction": prediction,
        "confidence": probabilities
    }

if __name__ == "__main__":
    train_pipeline()
    
    # STEP 14 - VALIDATION TEST
    print("\n--- STEP 14: Validation Test ---")
    sample_data = {
        "temp": 30.5,
        "humidity": 65.0,
        "rainfall": 12.0,
        "ndvi": 0.45,
        "flora": 0.6,
        "month": 6
    }
    output = predict_beehive(sample_data)
    print("Validation Output:", json.dumps(output, indent=2))
