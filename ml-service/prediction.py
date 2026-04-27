import requests
import json

# Start FastAPI first via: uvicorn ml_api:app --reload

# -------------------------------
# USER INPUT (MOCK NODE.JS DATA)
# -------------------------------
input_data = {
    "lat": 11.0168,
    "lon": 76.9558,
    "temp": 32,
    "humidity": 70,
    "rainfall": 2,
    "month": 4
}

url = "http://127.0.0.1:8000/predict"

try:
    print(f"Sending request to ML API at {url}...")
    print("Payload:", json.dumps(input_data, indent=2))
    
    response = requests.post(url, json=input_data)
    response.raise_for_status()
    
    result = response.json()
    print("\nAPI Response received successfully!\n")
    print("Flowering Level:", result['flowering_level'])
    print(f"Dynamically Calculated NDVI Trend: {result['ndvi_trend']:.5f}")
    
    if result['flowering_level'] == "High":
        print("Strong recommendation: Place beehives here")
    elif result['flowering_level'] == "Medium":
        print("Moderate potential: Can consider placement")
    else:
        print("Low flowering: Not recommended for hive placement")

except Exception as e:
    print("Failed to hit ML API:", e)
    if hasattr(e, 'response') and e.response is not None:
        print("Details:", e.response.text)