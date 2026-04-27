import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error

# -----------------------------
# LOAD DATA
# -----------------------------
df = pd.read_csv("flowering_dataset_full_tn1.csv")
print("Initial shape:", df.shape)

# Normalise column names
df.columns = df.columns.str.strip()

# Ensure lat/lon naming
if 'lat' not in df.columns and 'latitude' in df.columns:
    df = df.rename(columns={'latitude': 'lat', 'longitude': 'lon'})

# Parse date → month
df['date'] = pd.to_datetime(df['date'], errors='coerce')
df = df.dropna(subset=['date'])
df['month'] = df['date'].dt.month

# -----------------------------
# STEP 3 — DROP MISSING VALUES
# -----------------------------
df = df.dropna()
print("After dropna:", df.shape)

# -----------------------------
# STEP 4 — REMOVE OUTLIERS
# -----------------------------
df = df[
    (df["temp"]     >  10) & (df["temp"]     < 45) &
    (df["humidity"] >= 10) & (df["humidity"] <= 100) &
    (df["rainfall"] >= 0)
]
print("After outlier filter:", df.shape)

# -----------------------------
# STEP 2 — TARGET (continuous)
# -----------------------------
y = df["NDVI"] * 100
print("TARGET RANGE:", round(y.min(), 2), "–", round(y.max(), 2))

# -----------------------------
# STEP 1 — FEATURES (no NDVI → no leakage)
# -----------------------------
X = df[["temp", "humidity", "rainfall", "lat", "lon", "month"]]

# -----------------------------
# STEP 5 — NORMALIZE FEATURES
# -----------------------------
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# -----------------------------
# STEP 6 — TRAIN-TEST SPLIT
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y,
    test_size=0.2,
    random_state=42
)
print("Training size:", X_train.shape)
print("Testing size: ", X_test.shape)

# -----------------------------
# STEP 7 — TRAIN MODEL
# -----------------------------
model = RandomForestRegressor(
    n_estimators=150,
    max_depth=15,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# -----------------------------
# STEP 8 — EVALUATE
# -----------------------------
preds = model.predict(X_test)

r2  = r2_score(y_test, preds)
mae = mean_absolute_error(y_test, preds)

print("\n--- MODEL VALIDATION ---")
print("TEST R2:", r2)
print("MAE:    ", mae)

# -----------------------------
# STEP 9 — VALIDATE LEARNING
# -----------------------------
print("PRED MIN:", preds.min())
print("PRED MAX:", preds.max())
print("PRED RANGE:", preds.max() - preds.min())

if r2 >= 1.0:
    print("WARNING: R2 = 1.0 — possible leakage")
elif r2 < 0.0:
    print("WARNING: R2 negative — model is not learning")
else:
    print("R2 looks healthy.")
print("------------------------\n")

# -----------------------------
# STEP 10 — FEATURE IMPORTANCE
# -----------------------------
feature_names = ["temp", "humidity", "rainfall", "lat", "lon", "month"]
importance = pd.Series(model.feature_importances_, index=feature_names).sort_values(ascending=False)
print("FEATURE IMPORTANCE:")
print(importance)

# -----------------------------
# STEP 11 — SAVE MODEL + SCALER
# -----------------------------
joblib.dump(model,  "flowering_model.pkl")
joblib.dump(scaler, "flowering_scaler.pkl")
print("\nModel  saved -> flowering_model.pkl")
print("Scaler saved -> flowering_scaler.pkl")