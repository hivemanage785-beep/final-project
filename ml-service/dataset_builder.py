import ee
import requests
import pandas as pd
from datetime import datetime, timedelta

# -------------------------------
# INIT
# -------------------------------
ee.Initialize(project='hive-ml-project-492704')

# -------------------------------
# GRID GENERATION (Tamil Nadu)
# -------------------------------
def generate_grid():
    points = []

    lat = 8.0
    while lat <= 13.5:
        lon = 76.0
        while lon <= 80.5:
            points.append({
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "name": f"{round(lat,4)}_{round(lon,4)}"
            })
            lon += 0.15
        lat += 0.15

    return points

locations = generate_grid()

# -------------------------------
# NASA WEATHER FUNCTION (REAL)
# -------------------------------
def get_weather_nasa(lat, lon, start, end):
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"

    params = {
        "parameters": "T2M,PRECTOTCORR,RH2M",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": start,
        "end": end,
        "format": "JSON"
    }

    response = requests.get(url, params=params).json()
    return response["properties"]["parameter"]

# -------------------------------
# PARSE WEATHER
# -------------------------------
def parse_weather(data, date):
    key = date.strftime("%Y%m%d")

    return {
        "temp": data["T2M"].get(key),
        "humidity": data["RH2M"].get(key),
        "rainfall": data["PRECTOTCORR"].get(key)
    }

# -------------------------------
# NDVI FUNCTION (OPTIMIZED)
# -------------------------------
def get_ndvi(lat, lon, date):
    point = ee.Geometry.Point(lon, lat)

    start = date.strftime("%Y-%m-%d")
    end = (date + timedelta(days=16)).strftime("%Y-%m-%d")

    dataset = ee.ImageCollection("MODIS/061/MOD13Q1") \
        .filterDate(start, end) \
        .select("NDVI") \
        .mean()

    try:
        ndvi = dataset.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=point,
            scale=250
        ).get("NDVI")

        value = ee.Number(ndvi).getInfo()
        return value / 10000 if value else None

    except:
        return None

# -------------------------------
# LABEL FUNCTION
# -------------------------------
def label_flowering(ndvi):
    if ndvi is None:
        return None
    elif ndvi > 0.6:
        return "High"
    elif ndvi >= 0.3:
        return "Medium"
    else:
        return "Low"

# -------------------------------
# CONFIG
# -------------------------------
start_date = datetime(2022, 1, 1)
days = 180   # 180 days

# -------------------------------
# BUILD DATASET
# -------------------------------
data = []

for loc in locations:
    print(f"Processing {loc['name']}...")

    # Fetch FULL year weather once
    weather_data = get_weather_nasa(
        loc["lat"], loc["lon"],
        "20220101", "20221231"
    )

    # Fetch NDVI once per location at start_date
    ndvi_cache = get_ndvi(loc["lat"], loc["lon"], start_date)

    print(f"Processing {loc['name']} | Total rows so far: {len(data)}")

    for i in range(days):
        date = start_date + timedelta(days=i)

        weather = parse_weather(weather_data, date)

        if weather["temp"] is None or ndvi_cache is None:
            continue

        row = {
            "location": loc["name"],
            "lat": loc["lat"],
            "lon": loc["lon"],
            "date": date.strftime("%Y-%m-%d"),
            "temp": weather["temp"],
            "humidity": weather["humidity"],
            "rainfall": weather["rainfall"],
            "NDVI": ndvi_cache,
            "month": date.month,
            "flowering_label": label_flowering(ndvi_cache)
        }

        data.append(row)

# -------------------------------
# SAVE
# -------------------------------
df = pd.DataFrame(data)
df.to_csv("flowering_dataset_full_tn1.csv", index=False)

print("Dataset created:", df.shape)