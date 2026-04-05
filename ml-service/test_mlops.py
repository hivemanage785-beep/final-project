import time
import requests
import json
import os

def test_mlops_flow():
    BASE_URL = "http://127.0.0.1:8000"
    
    # Ensure service is up
    try:
        requests.get(f"{BASE_URL}/health")
    except:
        print("ML Service not available on :8000. Start uvicorn first.")
        return

    print("--- 1. Send 20 Predictions (Async Logging) ---")
    bad_payload = {"lat": 11.0, "lng": 78.0, "month": 6, "temp": 45, "humidity": 20, "rainfall": 0, "ndvi": 0.1, "flora": 1}
    good_payload = {"lat": 10.0, "lng": 79.0, "month": 8, "temp": 28, "humidity": 65, "rainfall": 50, "ndvi": 0.8, "flora": 8}
    
    for i in range(20):
        # Alternate good and bad configurations to simulate diversity
        pl = good_payload if i % 2 == 0 else bad_payload
        pl["lat"] = 11.0 + (i * 0.01) # vary slightly so feedback linker resolves correctly
        res = requests.post(f"{BASE_URL}/predict", json=pl)
        if i < 2:
            print(f"Pred {i} -> {res.json()}")

    # Sleep to allow BackgroundTasks to flush logging to JSONL
    time.sleep(2)
    
    print("\n--- 2. Send 15 Feedback Requests (Linker + Trigger Retrain) ---")
    for i in range(15):
        fb = good_payload if i % 2 == 0 else bad_payload
        fb["lat"] = 11.0 + (i * 0.01) # Match the payload
        fb["success"] = 1 if i % 2 == 0 else 0
        res = requests.post(f"{BASE_URL}/feedback", json=fb)
        
    print("Feedback payload sent. Waiting for async retrain logic to evaluate...")
    time.sleep(5)
    
    print("\n--- 3. Check JSONL persistence and linkage ---")
    if os.path.exists("predictions.jsonl"):
        with open("predictions.jsonl", "r") as f:
            lines = f.readlines()
            print(f"Log Size: {len(lines)} executed predictions found.")
            linked_count = sum(1 for line in lines if '"feedback": 0' in line or '"feedback": 1' in line)
            print(f"Linked Feedback Logs: {linked_count} successfully matched!")
    else:
        print("predictions.jsonl NOT found!")

    print("\n--- 4. Verify Active Model API Update ---")
    res = requests.get(f"{BASE_URL}/model-info")
    print("Model Info ->", json.dumps(res.json(), indent=2))
        
if __name__ == "__main__":
    test_mlops_flow()
