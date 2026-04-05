import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import joblib
import os

def preprocess(df):
    """Implement exact required transformations."""
    # Convert month to cyclical sin/cos features
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    
    # Select features in EXACT required order, excluding lat/lng
    features = ['temp', 'humidity', 'rainfall', 'ndvi', 'flora', 'month_sin', 'month_cos']
    return df[features]

def train():
    dataset_path = "tn_beehive_dataset.csv"
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset not found at {dataset_path}")
        return

    print("Loading dataset...")
    df = pd.read_csv(dataset_path)

    X = preprocess(df)
    y = df['score']

    print(f"Features: {list(X.columns)}")
    print("Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training RandomForestRegressor...")
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    print("Evaluating Model...")
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"Model Training Complete. Validation MAE: {mae:.4f}")

    joblib.dump(model, "model.pkl")
    print("Saved model to model.pkl successfully.")

if __name__ == "__main__":
    train()
