import ee
from datetime import datetime

ee.Initialize(project='hive-ml-project-492704')

# Test location (Coimbatore)
lat = 11.0168
lon = 76.9558
date = "2023-01-01"

point = ee.Geometry.Point(lon, lat)

import ee

ee.Initialize(project='hive-ml-project-492704')

lat = 11.0168
lon = 76.9558

point = ee.Geometry.Point(lon, lat)

# Use correct dataset + date range
dataset = ee.ImageCollection("MODIS/061/MOD13Q1") \
    .filterDate("2023-01-01", "2023-01-20") \
    .select("NDVI") \
    .mean()   # <-- IMPORTANT CHANGE

ndvi = dataset.reduceRegion(
    reducer=ee.Reducer.mean(),
    geometry=point,
    scale=250
).get("NDVI")

ndvi_value = ee.Number(ndvi).getInfo()

# Scale correction
ndvi_value = ndvi_value / 10000 if ndvi_value else None

print("NDVI Value:", ndvi_value)