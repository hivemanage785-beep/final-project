# ML Service - Hive Suitability Predictor

Standalone ML Service predicting hive suitability using weather, floral, and locational features.

## Prerequisites
Ensure Python is installed along with pip. 

Install dependencies first:
```bash
python -m pip install -r requirements.txt
```

## Running the Pipeline

### 1. Data Generation
Generate the tabular data required for training.
```bash
python generate_dataset.py
```
*(Produces `tn_beehive_dataset.csv`)*

### 2. Model Training
Train the underlying `RandomForestRegressor`. It will automatically split data, evaluate with MAE, and serialize the model.
```bash
python train.py
```
*(Produces `model.pkl`)*

### 3. FastAPI Service
Host the inferential endpoint over HTTP on local port 8000.
```bash
python -m uvicorn app:app --port 8000 --reload
```

## Endpoint 
`POST /predict`
```json
{
  "lat": 11.49,
  "lng": 76.73,
  "month": 4,
  "temp": 28.5,
  "humidity": 65.0,
  "rainfall": 12.0,
  "ndvi": 0.6,
  "flora": 8.5
}
```
**Returns:**
```json
{ "score": 84.5 }
```
