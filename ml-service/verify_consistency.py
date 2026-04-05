import joblib
import pandas as pd
import numpy as np

def preprocess(temp, humidity, rainfall, ndvi, flora, month):
    month_sin = np.sin(2 * np.pi * month / 12)
    month_cos = np.cos(2 * np.pi * month / 12)
    features = {
        'temp': temp, 'humidity': humidity, 'rainfall': rainfall,
        'ndvi': ndvi, 'flora': flora,
        'month_sin': month_sin, 'month_cos': month_cos
    }
    cols = ['temp', 'humidity', 'rainfall', 'ndvi', 'flora', 'month_sin', 'month_cos']
    return pd.DataFrame([features])[cols]

model = joblib.load("model.pkl")
tests = [
    (28.5, 65.0, 12.0, 0.6, 8.5, 4),
    (32.0, 45.0, 0.0, 0.3, 4.0, 5),
    (22.0, 80.0, 200.0, 0.7, 9.0, 11),
    (15.0, 90.0, 100.0, 0.2, 2.0, 1),
    (35.0, 30.0, 5.0, 0.1, 1.5, 7)
]

for i, t in enumerate(tests):
    X = preprocess(*t)
    score = model.predict(X)[0]
    print(f"Test {i+1}: Input={t} Result={score:.4f}")
