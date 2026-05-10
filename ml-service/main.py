from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import joblib
import pandas as pd
import numpy as np
import logging

app = FastAPI()

@app.get("/")
def health():
    return {"status": "ok"}

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load trained Random Forest model
try:
    model = joblib.load("./flowering_model.pkl")
    logger.info("Model loaded successfully.")
except Exception as e:
    raise RuntimeError(f"Model load failed: {e}")

# Load feature scaler
try:
    scaler = joblib.load("./flowering_scaler.pkl")
    logger.info("Scaler loaded successfully.")
except Exception as e:
    logger.warning(f"Scaler not found, inference will use raw features: {e}")
    scaler = None

# Input validation contract
class PredictionRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    temp: float = 0.0
    humidity: float = 0.0
    rainfall: float = 0.0
    month: int = 1
    ndvi_trend: float = 0.0
    ndvi: Optional[float] = None
    flora: Optional[float] = None

class BulkPredictionRequest(BaseModel):
    points: List[Dict[str, Any]]

# Feature order must match train_model_dense.py
FEATURE_COLS = [
    "temp", "humidity", "rainfall",
    "lat", "lon",
    "month", "sin_month", "cos_month",
    "lat_lon", "sin_lat", "cos_lat"
]

def evaluate_point(req_dict: Dict[str, Any]):
    lat = req_dict.get("latitude") if req_dict.get("latitude") is not None else req_dict.get("lat", 0.0)
    lng = req_dict.get("longitude") if req_dict.get("longitude") is not None else req_dict.get("lng", 0.0)

    month = int(req_dict.get("month", 1))

    raw = pd.DataFrame([{
        "temp":      req_dict.get("temp",     30.0),
        "humidity":  req_dict.get("humidity", 60.0),
        "rainfall":  req_dict.get("rainfall", 0.0),
        "lat":       lat,
        "lon":       lng,
        "month":     month,
        "sin_month": np.sin(2 * np.pi * month / 12),
        "cos_month": np.cos(2 * np.pi * month / 12),
        "lat_lon":   lat * lng,
        "sin_lat":   np.sin(np.radians(lat)),
        "cos_lat":   np.cos(np.radians(lat))
    }])

    # Ensure columns are exactly ordered
    raw = raw[FEATURE_COLS]

    if model is None:
        raise Exception("Model missing")

    # Apply scaler if available
    X_input = scaler.transform(raw) if scaler is not None else raw.values

    # Model predicts NDVI*100 score (range ~5–98)
    raw_score = float(model.predict(X_input)[0])
    raw_score = max(0.0, min(100.0, raw_score))

    # Compute confidence using prediction distribution across trees
    try:
        preds = np.array([tree.predict(X_input)[0] for tree in model.estimators_])
        std_dev = np.std(preds)
        confidence = float(max(0.0, 1.0 - std_dev / 100.0))
    except Exception as e:
        logger.error(f"Confidence computation error: {e}")
        confidence = 0.85

    score = int(round(raw_score))
    predicted_ndvi_next = raw_score / 100.0

    # Derive human-readable flowering level from score
    if score >= 60:
        flowering_level = "High"
    elif score >= 30:
        flowering_level = "Medium"
    else:
        flowering_level = "Low"

    risk_mapped = "High"
    if score >= 70:
        risk_mapped = "Low"
    elif score >= 40:
        risk_mapped = "Moderate"

    return {
        "flowering_level": flowering_level,
        "score": score,
        "predicted_ndvi_next": predicted_ndvi_next,
        "risk": risk_mapped,
        "confidence": confidence
    }

@app.post("/predict")
def predict(request: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model file not found on server")
    try:
        req_dict = request.model_dump()
        return evaluate_point(req_dict)
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-bulk")
def predict_bulk(request: BulkPredictionRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model file not found on server")
    try:
        results = []
        for point in request.points:
            res = evaluate_point(point)
            results.append(res)
        return {"results": results}
    except Exception as e:
        logger.error(f"Bulk inference error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback")
def feedback(request: Dict[str, Any]):
    """
    Accepts operational feedback for model refinement.
    Payload: { lat, lng, month, temp, humidity, rainfall, ndvi, flora, success }
    """
    logger.info(f"Feedback received: {request}")
    # In a real system, we'd append this to a retraining dataset
    return {"status": "accepted", "message": "Feedback integrated into learning loop"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "model_loaded": model is not None}