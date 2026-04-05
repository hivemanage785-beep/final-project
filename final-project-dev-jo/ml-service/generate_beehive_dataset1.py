import csv
import random
import requests
import time

# 🔑 PUT YOUR API KEY HERE
API_KEY = "6e90678c2e0f7e2f9f6c49e4815d3fc2"

random.seed(42)

# ─────────────────────────────────────────────
# DISTRICTS (Expanded to cover more of Tamil Nadu)
# ─────────────────────────────────────────────
DISTRICTS = [
    ("Nilgiris", 11.49, 76.73, 2240, "forest_hills", "very_high"),
    ("Coimbatore", 11.01, 76.95, 411, "agri_urban", "high"),
    ("Madurai", 9.92, 78.11, 101, "agri_urban", "moderate"),
    ("Chennai", 13.08, 80.27, 6, "urban", "very_low"),
    ("Salem", 11.66, 78.14, 278, "agri_urban", "moderate"),
    ("Erode", 11.34, 77.71, 183, "agri", "moderate"),
    ("Tirunelveli", 8.71, 77.75, 47, "agri", "moderate"),
    ("Kanyakumari", 8.08, 77.53, 30, "coastal_agri", "high"),
    ("Trichy", 10.79, 78.70, 88, "agri_urban", "moderate"),
    ("Thanjavur", 10.78, 79.13, 57, "agri", "high")
]

# ─────────────────────────────────────────────
# WEATHER API (Called once per district)
# ─────────────────────────────────────────────
def get_weather(lat, lng):
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={API_KEY}&units=metric"
    try:
        res = requests.get(url, timeout=5)
        data = res.json()
        if "main" in data:
            temp = data["main"]["temp"]
            humidity = data["main"]["humidity"]
            return temp, humidity
    except Exception as e:
        print(f"Weather error for ({lat}, {lng}):", e)
    
    # Realistic fallback values for TN if API fails
    return 28.0, 65.0 

# ─────────────────────────────────────────────
# SEASONAL & RANDOM VARIATIONS
# ─────────────────────────────────────────────
def get_seasonal_temp_offset(month):
    """Adds temperature variation to base API temp based on the month."""
    if month in [12, 1, 2]:    # Winter (cooler)
        return random.uniform(-4, -1)
    elif month in [3, 4, 5]:   # Summer (much hotter)
        return random.uniform(2, 6)
    else:                      # Monsoon/Post-Monsoon (mildly warm)
        return random.uniform(-1, 2)

def get_rainfall(month):
    """Generates realistic rainfall (0-300mm), higher during NE Monsoon (Oct-Dec)"""
    if month in [10, 11, 12]:  # TN main monsoon
        return random.uniform(100, 300)
    elif month in [6, 7, 8, 9]: # SW Monsoon (mild in TN)
        return random.uniform(20, 100)
    else:                      # Dry months
        return random.uniform(0, 30)

# ─────────────────────────────────────────────
# VEGETATION + FLORA
# ─────────────────────────────────────────────
def get_ndvi(land_use):
    if "forest" in land_use:
        return random.uniform(0.6, 0.8)
    elif "urban" in land_use:
        return random.uniform(0.1, 0.3)
    else:
        return random.uniform(0.3, 0.6)

def get_flora(district):
    """Kept district-based logic, added small randomness naturally"""
    if district == "Nilgiris":
        return random.uniform(8, 10)
    elif district == "Coimbatore":
        return random.uniform(6, 8)
    elif district == "Chennai":
        return random.uniform(1, 3)
    else:
        return random.uniform(4, 7)

# ─────────────────────────────────────────────
# SCORING FUNCTION (kept existing logic)
# ─────────────────────────────────────────────
def compute_score(temp, humidity, ndvi, flora):
    temp_score = max(0, 1 - abs(temp - 26) / 10)
    hum_score = max(0, 1 - abs(humidity - 65) / 25)

    score = (
        flora * 3 +
        ndvi * 25 +
        ((temp_score + hum_score) / 2) * 20
    )

    return round(min(100, score), 1)

# ─────────────────────────────────────────────
# DATASET GENERATION
# ─────────────────────────────────────────────
def generate_dataset():
    rows = []

    # 10 Districts * 12 Months * 10 samples = 1200 rows (satisfies min 1000)
    for district, lat, lng, elevation, land_use, activity in DISTRICTS:
        print(f"Fetching base weather for {district}...")
        
        # 1. Fetch weather ONCE per district
        base_temp, base_humidity = get_weather(lat, lng)
        time.sleep(1)  # avoid API limit on free tier

        # 2. Iterate through all 12 months
        for month in range(1, 13):
            # 3. Generate 10 samples for each month to simulate localized data
            for i in range(10):
                # Random jitter for lat/lng (+/- ~15km roughly)
                jitter_lat = lat + random.uniform(-0.15, 0.15)
                jitter_lng = lng + random.uniform(-0.15, 0.15)

                # Month-based temp & moisture variation
                temp_offset = get_seasonal_temp_offset(month)
                temp = round(base_temp + temp_offset, 1)

                # Humidity with +/- 5 variation as requested
                hum_offset = random.uniform(-5.0, 5.0)
                humidity = round(min(100, max(0, base_humidity + hum_offset)), 1)
                
                # Dynamic meaningful rainfall
                rainfall = round(get_rainfall(month), 1)

                ndvi = get_ndvi(land_use)
                flora = get_flora(district)

                score = compute_score(temp, humidity, ndvi, flora)

                rows.append({
                    "district": district,
                    "lat": round(jitter_lat, 4),
                    "lng": round(jitter_lng, 4),
                    "month": month,
                    "temp": temp,
                    "humidity": humidity,
                    "rainfall": rainfall,
                    "ndvi": round(ndvi, 3),
                    "flora": round(flora, 2),
                    "score": score
                })

    return rows

# ─────────────────────────────────────────────
# SAVE CSV
# ─────────────────────────────────────────────
def save_csv(rows):
    if not rows:
        print("No data generated.")
        return

    filename = "tn_beehive_dataset.csv"
    columns = ["district", "lat", "lng", "month", "temp", "humidity", "rainfall", "ndvi", "flora", "score"]

    try:
        with open(filename, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=columns)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Dataset saved: {filename} ({len(rows)} rows)")
    except PermissionError:
        import time
        fallback_name = f"tn_beehive_dataset_{int(time.time())}.csv"
        print(f"Warning: '{filename}' is currently open in another program (e.g., Excel).")
        with open(fallback_name, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=columns)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Dataset successfully saved as fallback: {fallback_name} ({len(rows)} rows)")

# ─────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating large dataset...")
    data = generate_dataset()
    save_csv(data)
    print("Done!")