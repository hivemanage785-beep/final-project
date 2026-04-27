import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error

# -----------------------------
# LOAD DATA
# -----------------------------
df = pd.read_csv("flowering_dataset_full_tn.csv")

print("Initial shape:", df.shape)

# -----------------------------
# FIX COLUMN NAMES
# -----------------------------
if 'latitude' not in df.columns and 'lat' in df.columns:
    df = df.rename(columns={'lat': 'latitude'})

if 'longitude' not in df.columns and 'lon' in df.columns:
    df = df.rename(columns={'lon': 'longitude'})

# -----------------------------
# CREATE LOCATION
# -----------------------------
if 'location' not in df.columns:
    df['location'] = df['latitude'].astype(str) + "_" + df['longitude'].astype(str)

# -----------------------------
# DATE + MONTH
# -----------------------------
df['date'] = pd.to_datetime(df['date'], errors='coerce')
df = df.dropna(subset=['date'])
df['month'] = df['date'].dt.month

# -----------------------------
# NDVI TREND & TARGET (FORECASTING)
# -----------------------------
df = df.sort_values(by=['location', 'date'])

# Features at time t
df['ndvi_prev'] = df.groupby('location')['NDVI'].shift(1)
df['ndvi_trend'] = df['NDVI'] - df['ndvi_prev']
df['ndvi_trend'] = df['ndvi_trend'].fillna(0)

# Time-aware alignment for target (Join with next month's data using date offset)
df['target_date'] = df['date'] + pd.DateOffset(days=30)
df_target = df[['location', 'date', 'NDVI']].rename(columns={'date': 'target_date', 'NDVI': 'ndvi_target'})
df = pd.merge(df, df_target, on=['location', 'target_date'], how='inner')

# -----------------------------
# REQUIRED COLUMNS CHECK
# -----------------------------
required_columns = [
    'NDVI', 'ndvi_trend', 'latitude', 'longitude',
    'temp', 'humidity', 'rainfall', 'month', 'ndvi_target'
]

df = df.dropna(subset=required_columns)

print("After temporal targeting (offset join) & cleaning:", df.shape)

# -----------------------------
# FEATURE SELECTION
# -----------------------------
X = df[['NDVI', 'ndvi_trend', 'temp', 'humidity', 'rainfall', 'month', 'latitude', 'longitude']]
y = df["ndvi_target"]

# -----------------------------
# TRAIN TEST SPLIT
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("Training size:", X_train.shape)
print("Testing size:", X_test.shape)

# -----------------------------
# MODEL TRAINING (REGRESSION)
# -----------------------------
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# -----------------------------
# PREDICTION & EVALUATION
# -----------------------------
y_pred = model.predict(X_test)

mse = mean_squared_error(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("\n--- MODEL VALIDATION ---")
print("Mean Squared Error:", mse)
print("Mean Absolute Error (MAE):", mae)
print("R² Score:", r2)
print("------------------------\n")

# -----------------------------
# FEATURE IMPORTANCE
# -----------------------------
feature_importance = pd.Series(model.feature_importances_, index=X.columns)
feature_importance = feature_importance.sort_values(ascending=False)

print("\nFeature Importance:")
print(feature_importance)

# -----------------------------
# SAVE MODEL
# -----------------------------
joblib.dump(model, "flowering_model.pkl")
print("\nRegression Model saved successfully to flowering_model.pkl")