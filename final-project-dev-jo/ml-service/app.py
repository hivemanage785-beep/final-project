from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import pandas as pd
import numpy as np
import joblib
import os

app = FastAPI(title="Hive Suitability Inference Service")

# 1. LOAD MODEL
MODEL_PATH = "model.pkl"
try:
    model = joblib.load(MODEL_PATH)
    print(f"Loaded model from {MODEL_PATH}")
except Exception as e:
    print(f"CRITICAL: Failed to load model: {e}")
    model = None

# Input Schema with Validation
class PredictRequest(BaseModel):
    temp: float = Field(..., ge=-10, le=60, description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity %")
    rainfall: float = Field(..., ge=0, le=1000, description="Rainfall in mm")
    ndvi: float = Field(..., ge=-1, le=1, description="NDVI value (-1 to 1)")
    flora: float = Field(..., ge=0, le=10, description="Flora density score (0 to 10)")
    month: int = Field(..., ge=1, le=12, description="Month of the year (1-12)")

class PredictResponse(BaseModel):
    score: float
    confidence: Optional[float] = None
    risk: int
    model: str = "beehive_rf_v2"
    warning: Optional[str] = None

# 2. PREPROCESSING FUNCTION
def preprocess(req: PredictRequest):
    """Implement EXACT transformations matching training pipeline."""
    # Convert month to cyclical sin/cos features
    month_sin = np.sin(2 * np.pi * req.month / 12)
    month_cos = np.cos(2 * np.pi * req.month / 12)
    
    # Feature order: [temp, humidity, rainfall, ndvi, flora, month_sin, month_cos]
    # NOTE: lat/lng removed as per requirements (not used in this model version)
    features = {
        'temp': req.temp,
        'humidity': req.humidity,
        'rainfall': req.rainfall,
        'ndvi': req.ndvi,
        'flora': req.flora,
        'month_sin': month_sin,
        'month_cos': month_cos
    }
    
    # Ensure exact column order for sklearn
    cols = ['temp', 'humidity', 'rainfall', 'ndvi', 'flora', 'month_sin', 'month_cos']
    return pd.DataFrame([features])[cols]

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}

# 4. PREDICTION ENDPOINT
@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded on server.")
    
    try:
        # Preprocess
        X = preprocess(req)
        
        # Predict
        score = float(model.predict(X)[0])
        
        # Estimate confidence based on tree variance (Standard Deviation)
        all_tree_preds = np.stack([tree.predict(X.values) for tree in model.estimators_])
        std = np.std(all_tree_preds)
        confidence = max(0.1, 1 - (std / 40)) # Heuristic mapping variance to 0.1-1 range
        
        # Risk levels consistent with training metrics
        risk = 0 if score < 30 else (1 if score <= 45 else 2)
        
        warning = "LOW_CONFIDENCE" if confidence < 0.6 else None
        
        return {
            "score": round(score, 2),
            "confidence": round(float(confidence), 2),
            "risk": risk,
            "model": "beehive_rf_v2",
            "warning": warning
        }
    except Exception as e:
        print(f"Inference error: {e}")
        # 6. REMOVE OLD LOGIC: Fallbacks are now handled as errors to ensure consistency
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# 5. CONSISTENCY CHECK SCRIPT
def run_consistency_test():
    """Run 5 test inputs to verify consistency."""
    tests = [
        {"temp": 28.5, "humidity": 65.0, "rainfall": 12.0, "ndvi": 0.6, "flora": 8.5, "month": 4},
        {"temp": 32.0, "humidity": 45.0, "rainfall": 0.0, "ndvi": 0.3, "flora": 4.0, "month": 5},
        {"temp": 22.0, "humidity": 80.0, "rainfall": 200.0, "ndvi": 0.7, "flora": 9.0, "month": 11},
        {"temp": 15.0, "humidity": 90.0, "rainfall": 50.0, "ndvi": 0.2, "flora": 2.0, "month": 1},
        {"temp": 35.0, "humidity": 30.0, "rainfall": 5.0, "ndvi": 0.1, "flora": 1.5, "month": 7}
    ]
    
    print("--- CONSISTENCY CHECK ---")
    for i, t in enumerate(tests):
        req = PredictRequest(**t)
        X = preprocess(req)
        score = model.predict(X)[0]
        print(f"Test {i+1}: Input={t} -> Score={score:.2f}")

if __name__ == "__main__":
    if model: run_consistency_test()
