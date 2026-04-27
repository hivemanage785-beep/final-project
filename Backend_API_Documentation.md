# Backend API Documentation

## Overview
This document describes **all backend data entities (MongoDB models)** and **HTTP API endpoints** exposed by the HiveOps system. For each endpoint we list the HTTP method, path, expected request body/query parameters, and the JSON response format. The backend is built with **Node.js + Express**, uses **Mongoose** for MongoDB models, and includes a **FastAPI ML micro‑service** for predictions.

---

## Data Entities (Mongoose Models)

### 1. `Tile`
- **Collection:** `tiles`
- **Purpose:** Stores pre‑computed heat‑map raster grids for a given zoom (`z`), tile coordinates (`x`,`y`) and month.
- **Schema fields:**
  ```js
  {
    z: Number,      // zoom level
    x: Number,      // column index
    y: Number,      // row index
    month: Number,  // 1‑12
    grid: [[Number]], // 2‑D array of scores (0‑100)
    createdAt: Date
  }
  ```
- **Indexes:** `{z:1, x:1, y:1, month:1}` (unique).

### 2. `GeoTile`
- **Collection:** `geotiles`
- **Purpose:** Stores cached environmental data for a geographic cell and month, plus optionally pre‑computed ML inference.
- **Key fields:**
  - `tileKey` – string "lat_lng_month" (unique)
  - `lat`, `lng`, `month`
  - `avgTemp`, `avgRain`, `avgWind`, `avgHumidity`
  - `floraCount`, `ndvi`, `ndvi_trend`
  - `mlScore`, `mlRisk`, `mlConfidence`, `mlWarning`, `mlModel`
  - `ttlExpires` – 6‑hour TTL for automatic expiry
- **Indexes:** `tileKey` (unique) and TTL index on `ttlExpires`.

### 3. `Hive`
- **Collection:** `hives`
- **Fields:**
  - `_id` (string), `uid` (frontend UID), `ownerId` (ref User), `hive_id`, `lat`, `lng`
  - `box_count`, `queen_status`, `health_status`
  - `last_inspection_date`, `location_history[]`, `notes`, `syncVersion`
- **Indexes:** `uid`, `ownerId + hive_id`.

### 4. `SavedLocation`
- **Collection:** `savedlocations`
- **Fields:** `_id` (string), `user_id`, `uid`, `lat`, `lng`, `score`, `month`, `created_at`, `syncVersion`.
- **Indexes:** `{uid:1, created_at:-1}`.

### 5. `Farmer`
- **Collection:** `farmers`
- **Fields:** `farmer_id` (UUID), `name`, `phone`, `crop_type[]`, `status` (pending/approved/rejected), `is_public`, `location` (GeoJSON Point), `rating`, `syncVersion`.
- **Indexes:** 2dsphere on `location`.

### 6. `User`
- **Collection:** `users`
- **Fields:** `email`, `firebaseUid`, `displayName`, `role` (`admin` | `beekeeper`), `isVerified`, `syncVersion`.
- **Indexes:** `firebaseUid`.

### 7. `Inspection`
- **Collection:** `inspections`
- **Fields:** `hiveId`, `userId`, `date`, `notes`, `photos[]`, `riskLevel`, `score`.
- **Indexes:** `hiveId`, `userId`.

*Other auxiliary models (e.g., `Harvest`, `Request`, `Contact`) follow similar patterns and are omitted for brevity.*

---

## API Endpoints
> All routes are mounted under `/api` unless otherwise noted.

### Authentication
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new Firebase‑backed user. Returns JWT.
| `POST` | `/api/auth/login` | Login, returns JWT and user profile.
| `GET` | `/api/auth/me` | Returns current user (requires JWT).

### Scoring
| Method | Path | Request Body | Response |
|---|---|---|---|
| `POST` | `/api/score` | `{ "lat": Number, "lng": Number, "month": Number }` | `{ success:true, data:{ score, riskLevel, mlConfidence, mlModel, tileKey, dataSource, computedAt, ndvi, ... } }`

### Heatmap (pre‑computed tile grid)
| Method | Path | Query Params | Response |
|---|---|---|---|
| `GET` | `/api/heatmap` | `month`, `neLat`, `neLng`, `swLat`, `swLng` | `{ success:true, data:{ month, points:[{lat,lng,score,intensity}] } }`

### Tile Retrieval (raw raster grid)
| Method | Path | Params | Response |
|---|---|---|---|
| `GET` | `/api/tile/:z/:x/:y` | `?month=NUM` | `{ status:"success", grid:[[Number]] }` (empty grid with `empty:true` if missing).

### NDVI Lookup
| Method | Path | Query | Response |
|---|---|---|---|
| `GET` | `/api/ndvi` | `lat`, `lng`, `date` (optional) | `{ ndvi: Number, trend: Number, timestamp }`

### Prediction (ML service proxy)
| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/predict` | `{ lat, lon }` (optional weather overrides) | `{ status:"success", location:{lat,lon}, weather:{...}, prediction:{ flowering_level, recommendation }, nearby_farmers:[...] }`

### Hive Management
| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/hives` | – | List of hives belonging to the authenticated user.
| `POST` | `/api/hives` | Hive creation payload | Created hive object.
| `PUT` | `/api/hives/:id` | Update fields | Updated hive.
| `DELETE` | `/api/hives/:id` | – | Deletion acknowledgement.

### Saved Locations
| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/saved-locations` | – | List of saved locations for the user.
| `POST` | `/api/saved-locations` | `{ lat, lng, score, month }` | Saved record.
| `DELETE` | `/api/saved-locations/:id` | – | Deletion result.

### Farmers (admin‑only)
| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/farmers` | – | List of farmer profiles.
| `POST` | `/api/farmers` | Create farmer request.
| `PATCH` | `/api/farmers/:id/status` | `{ status:"approved"|"rejected" }` | Status change.
| `DELETE` | `/api/farmers/:id` | – | Remove farmer.

### Allocation Engine
| Method | Path | Body | Response |
|---|---|---|---|
| `POST` |api/allocate-hives` | `{ locations:[{lat,lng,temp?,rainfall?,humidity?,month?}], hiveCount, currentHiveLocations?, useTimeOptimization?, months? }` | `{ success:true, data:{ mode:"static"|"time-optimized", allocations|recommendations } }`

### Simulation Engine
| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/simulate` | `{ locations:[{lat,lng,score}], hiveCount, iterations? }` | `{ success:true, data:{ simulationResults… } }`

### Trace Score (QR batch traceability)
| Method | Path | Query | Response |
|---|---|---|---|
| `GET` | `/api/trace-score` | `lat`, `lng`, `month` | `{ success:true, data:{ traceId, score, risk, confidence } }`

### Feedback (user‑submitted)
| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/feedback` | `{ type, message, screenshotUrl? }` | `{ success:true, id }`

### Sync (offline‑first queue)
| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/sync` | Batch of CRUD operations performed while offline | `{ success:true, processedCount }`

### Admin Dashboard (protected, admin role)
| Method | Path | Description |
|---|---|---|
| `GET /api/admin/requests` | List pending farmer contact requests.
| `POST /api/admin/requests/:id/approve` | Approve a farmer request.
| `GET /api/admin/farmers` | List all farmers.
| `PATCH /api/admin/farmers/:id/status` | Update farmer status.
| `GET /api/admin/beekeepers` | List verified beekeepers.
| `PATCH /api/admin/beekeepers/:id/verify` | Verify beekeeper account.
| `GET /api/admin/telemetry` | System telemetry summary.

---

## Common Response Wrapper
All successful responses follow the shape:
```json
{
  "success": true,
  "data": { /* endpoint‑specific payload */ }
}
```
Error responses use HTTP status codes (400, 401, 403, 404, 500) and a body:
```json
{ "success": false, "error": "ERROR_CODE", "message": "Human readable message", "details": { … } }
```

---

## Usage Notes
- **Rate limiting** is applied globally via `rateLimiter` and per‑route (`authLimiter`, `syncLimiter`).
- **Offline‑first**: client stores mutations locally and pushes them to `/api/sync` when connectivity returns.
- **ML service URL** is configured via `ML_SERVICE_URL` environment variable (defaults to `http://localhost:8000`).
- **Tile generation** runs on server start and every 30 minutes (see `runTileGeneration`).

*Document generated on 2026‑04‑26.*
