"""
train_model_dense.py

Trains a RandomForestRegressor on the dense 0.1° resolution Tamil Nadu dataset.

Target   : NDVI * 100  (continuous, range ~5–98)
Features : temp, humidity, rainfall, lat, lon, month,
           lat_lon (interaction), sin_lat, cos_lat (cyclic encoding)

No classification labels used — pure regression.
"""

import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error

# ── LOAD ─────────────────────────────────────────────────────────────────────
print("Loading dense dataset...")
df = pd.read_csv("flowering_dataset_dense.csv")
print(f"Initial shape: {df.shape}")

df.columns = df.columns.str.strip()

# ── CLEAN ────────────────────────────────────────────────────────────────────
required = ["temp", "humidity", "rainfall", "lat", "lon", "month", "NDVI"]
df = df.dropna(subset=required)

# Remove meteorological outliers
df = df[
    (df["temp"]     >  10) & (df["temp"]     < 45) &
    (df["humidity"] >= 10) & (df["humidity"] <= 100) &
    (df["rainfall"] >= 0)
]
print(f"After clean: {df.shape}")

# ── ENGINEER FEATURES ────────────────────────────────────────────────────────
# These capture non-linear spatial structure the RF can exploit
if "lat_lon" not in df.columns:
    df["lat_lon"] = df["lat"] * df["lon"]
if "sin_lat" not in df.columns:
    df["sin_lat"] = np.sin(np.radians(df["lat"]))
if "cos_lat" not in df.columns:
    df["cos_lat"] = np.cos(np.radians(df["lat"]))

# Cyclic month encoding (Jan and Dec are adjacent)
df["sin_month"] = np.sin(2 * np.pi * df["month"] / 12)
df["cos_month"] = np.cos(2 * np.pi * df["month"] / 12)

# ── TARGET ───────────────────────────────────────────────────────────────────
y = df["NDVI"] * 100
print(f"TARGET RANGE: {y.min():.2f} – {y.max():.2f}")

if y.max() - y.min() < 40:
    print("WARNING: Target range < 40 — spatial variation may be insufficient")
else:
    print(f"✓ Target range = {(y.max() - y.min()):.1f} (healthy)")

# ── FEATURES ─────────────────────────────────────────────────────────────────
FEATURE_COLS = [
    "temp", "humidity", "rainfall",
    "lat", "lon",
    "month", "sin_month", "cos_month",
    "lat_lon", "sin_lat", "cos_lat"
]
X = df[FEATURE_COLS]
print(f"Features: {FEATURE_COLS}")
print(f"Dataset size: {len(X):,} rows")

# ── SCALE ────────────────────────────────────────────────────────────────────
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ── SPLIT ────────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)
print(f"Train: {X_train.shape[0]:,}   Test: {X_test.shape[0]:,}")

# ── TRAIN ────────────────────────────────────────────────────────────────────
print("\nTraining RandomForestRegressor...")
model = RandomForestRegressor(
    n_estimators=150,
    max_depth=15,
    min_samples_leaf=3,   
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)
print("Training complete.")

# ── EVALUATE ─────────────────────────────────────────────────────────────────
preds = model.predict(X_test)
r2  = r2_score(y_test, preds)
mae = mean_absolute_error(y_test, preds)

print("\n─── MODEL VALIDATION ───")
print(f"R²  : {r2:.4f}")
print(f"MAE : {mae:.2f}")
print(f"Pred range: {preds.min():.1f} – {preds.max():.1f}  (span: {preds.max()-preds.min():.1f})")

if r2 >= 1.0:
    print("WARNING: R² = 1.0 — possible data leakage")
elif r2 < 0.0:
    print("WARNING: R² negative — model is not learning")
elif r2 > 0.85:
    print("✓ R² looks healthy")
else:
    print("⚠ R² moderate — consider more data or features")

# Verify spatial variation across nearby points
print("\n─── SPATIAL VARIATION CHECK ───")
test_points = pd.DataFrame({
    "temp": [28.0] * 4, "humidity": [75.0] * 4, "rainfall": [2.0] * 4,
    "lat":  [11.0, 11.1, 11.0, 11.1],
    "lon":  [77.0, 77.0, 77.1, 77.1],
    "month": [4] * 4,
})
test_points["sin_month"] = np.sin(2 * np.pi * test_points["month"] / 12)
test_points["cos_month"] = np.cos(2 * np.pi * test_points["month"] / 12)
test_points["lat_lon"]   = test_points["lat"] * test_points["lon"]
test_points["sin_lat"]   = np.sin(np.radians(test_points["lat"]))
test_points["cos_lat"]   = np.cos(np.radians(test_points["lat"]))

test_scaled = scaler.transform(test_points[FEATURE_COLS])
nearby_preds = model.predict(test_scaled)
print("Nearby predictions (0.1° apart):", [f"{p:.1f}" for p in nearby_preds])
variation = nearby_preds.max() - nearby_preds.min()
print(f"Spatial variation at 0.1° scale: {variation:.2f}")
if variation > 2.0:
    print("✓ Good spatial variation")
else:
    print("⚠ Low spatial variation — heatmap may still look flat")

# ── FEATURE IMPORTANCE ───────────────────────────────────────────────────────
print("\n─── FEATURE IMPORTANCE ───")
importance = pd.Series(
    model.feature_importances_, index=FEATURE_COLS
).sort_values(ascending=False)
print(importance.to_string())

# ── SAVE ─────────────────────────────────────────────────────────────────────
joblib.dump(model,  "flowering_model.pkl")
joblib.dump(scaler, "flowering_scaler.pkl")
print("\n✓ flowering_model.pkl  saved")
print("✓ flowering_scaler.pkl saved")
print("\nDone. Restart ml_api.py to load the new model.")
