import requests
import time

def verify():
    url = "http://127.0.0.1:8001"

    # Wait for server to be accessible
    print("Waiting for FastAPI server...")
    for i in range(10):
        try:
            res = requests.get(f"{url}/health")
            if res.status_code == 200:
                print("Server is active.")
                break
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(1)
    else:
        print("Failed to connect to server.")
        return

    # Test predict endpoint
    payload = {
        "lat": 10.5,
        "lng": 78.2,
        "month": 4
    }
    
    print(f"Testing POST /predict with data: {payload}")
    res = requests.post(f"{url}/predict", json=payload)
    
    if res.status_code == 200:
        print(f"Success! Response: {res.json()}")
    else:
        print(f"Error! Status Code: {res.status_code}, Body: {res.text}")

if __name__ == "__main__":
    verify()
