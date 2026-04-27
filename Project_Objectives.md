# Project Objectives – HiveOps (BUZZ-OFF Heritage Apiary Management System)

## Overview

HiveOps is a full-stack, intelligent apiary management platform built to address the operational complexity of modern multi-hive beekeeping. The system integrates a Progressive Web App (PWA) frontend, a Node.js/Express backend, a Firebase cloud database, and a dedicated Python FastAPI machine learning microservice to deliver a production-ready, data-driven beekeeping assistant.

---

## Original Objectives (Initial Scope)

The following objectives were defined at the beginning of the project and represent the foundational goals of the system:

| # | Original Objective |
|---|---|
| 1 | To design an offline-first mobile application for hive management |
| 2 | To implement rule-based operational intelligence for risk detection |
| 3 | To provide seasonal awareness using cached data |
| 4 | To enable honey batch traceability using QR codes |
| 5 | To reduce uncertainty in multi-hive operations |
| 6 | To ensure system usability without internet dependency |

---

## Updated Objectives (Revised & Expanded Scope)

Based on the full system implementation, the objectives have been revised to accurately reflect the delivered features, technical architecture, and the scope of intelligence incorporated into the final product.

### Objective 1 *(Revised)*
**Original:** To design an offline-first mobile application for hive management.

**Updated:** To design and deploy a cross-platform Progressive Web App (PWA) for comprehensive apiary management, supporting full offline read/write capability through Firestore IndexedDB persistent local cache and Workbox service worker caching, with a responsive mobile-first UI featuring bottom tab navigation and installability on both mobile and desktop platforms.

> **What changed:** The scope expanded beyond a basic mobile app to a full PWA with an installable shell, persistent local database cache (IndexedDB via Firestore SDK), and a synchronized role-based authentication system (Phone OTP + Google Sign-In) supporting Admin and Beekeeper roles.

---

### Objective 2 *(Significantly Revised)*
**Original:** To implement rule-based operational intelligence for risk detection.

**Updated:** To implement a hybrid intelligence layer combining **machine learning-based forecasting** with **rule-based alert generation**, enabling proactive risk detection across hives. The ML microservice (FastAPI + Random Forest Regressor, R² = 0.71) predicts future vegetation health (NDVI) to identify optimal hive placement windows, while rule-based alerts flag critical operational events including temperature spikes, treatment schedules, and sensor anomalies — categorized by priority (High / Medium / Low).

> **What changed:** The original scope assumed purely rule-based logic. The final system implements a dual-intelligence approach: a trained Random Forest Regressor for environmental forecasting and a structured alert schema (`/alerts/{alertId}`) for real-time operational risk notification. Risk outputs include a computed 0–100 scoring index and a `risk` classification field (`Low / Medium / High`) returned by the ML endpoint.

---

### Objective 3 *(Significantly Revised)*
**Original:** To provide seasonal awareness using cached data.

**Updated:** To provide real-time and predictive seasonal awareness by integrating live climate APIs (temperature, humidity, rainfall) with a trained geospatial ML model, augmented by a **precomputed tile-based heatmap system** that caches environmental scoring data across a geographic grid. The system delivers spatial bloom forecasts up to 30 days ahead using NDVI trend analysis across the Tamil Nadu region, with tile data persisted in MongoDB for low-latency, offline-capable map rendering via WebGL BitmapLayer.

> **What changed:** "Cached data" originally implied simple static storage. The final implementation features a dynamic tile-precomputation pipeline seeded with 100,000+ geospatial data points, rendered as a smooth, high-fidelity heatmap on the frontend using WebGL. Seasonal predictions are driven by the ML model's learned understanding of monthly bloom cycles (Feature Importance: Month = 0.089, NDVI = 0.551, NDVI Trend = 0.203).

---

### Objective 4 *(Retained & Implemented)*
**Original:** To enable honey batch traceability using QR codes.

**Updated:** To enable end-to-end honey batch traceability through a dedicated QR Code scanning and generation system (`QRTrace.tsx`), linking each harvest batch to its originating hive, apiary, flora type, purity rating, moisture content, terroir profile, and a blockchain-style certification hash. The `TracePage.tsx` provides a full public-facing batch lookup interface, ensuring transparent and auditable provenance for Heritage Apiary produce — viewable without authentication.

> **What changed:** The objective has been fully implemented as specified. The traceability model (`/harvests/{harvestId}`) includes rich metadata fields: `batchId`, `floraType`, `purity`, `moisture`, `terroir`, and a `hash` field for immutable audit trails. QR scanning is implemented as a dedicated mobile-optimized page within the PWA.

---

### Objective 5 *(Significantly Revised)*
**Original:** To reduce uncertainty in multi-hive operations.

**Updated:** To reduce operational uncertainty in multi-hive environments through: **(a)** ML-driven hive placement optimization via the `/allocate` endpoint which scores candidate locations using environmental vectors, **(b)** a hive simulation engine (`/simulate`) that models temporal colony performance across multiple locations, **(c)** a Saved Locations system (MongoDB-backed, IndexedDB-synced) enabling persistent geographic decision support, and **(d)** a real-time dashboard providing colony health, temperature, humidity, and alert aggregates across all registered hives.

> **What changed:** The original objective was broad. The system now provides three distinct uncertainty-reduction mechanisms: ML-based scoring, a simulation engine for scenario modelling, and a persistent saved-locations layer. Together, they give beekeepers data-driven confidence for relocation and seasonal planning decisions across an arbitrary number of hives.

---

### Objective 6 *(Retained & Significantly Enhanced)*
**Original:** To ensure system usability without internet dependency.

**Updated:** To ensure full system usability in offline and low-connectivity environments through: **(a)** Firestore offline persistence providing read/write access to all hive, inspection, harvest, and alert data without an active connection, **(b)** Workbox service worker caching of all static frontend assets enabling full PWA installation and app-shell loading offline, **(c)** precomputed and locally-cached tile heatmap data reducing dependency on live API calls, and **(d)** a background sync architecture that queues mutations and reconciles data with the cloud server when connectivity is restored.

> **What changed:** Offline capability moved from a design goal to a fully implemented, multi-layered architecture. The system uses both Firebase's native offline SDK and a custom sync service to guarantee that beekeepers operating in remote apiaries with no signal can continue logging inspections, viewing hive data, and accessing map visualizations without degradation.

---

## Summary of Objective Evolution

| # | Original Objective | Final Status | Key Addition |
|---|---|---|---|
| 1 | Offline-first mobile app | ✅ Enhanced | Full PWA + Firestore IndexedDB + Role-based Auth |
| 2 | Rule-based risk detection | ✅ Enhanced | ML Forecasting (Random Forest) + Alert Schema |
| 3 | Seasonal awareness via cache | ✅ Enhanced | Precomputed Tile Heatmap + Live Climate API Integration |
| 4 | QR code batch traceability | ✅ Implemented | QR Scan/Generate + Public Trace Page + Cert Hash |
| 5 | Reduce multi-hive uncertainty | ✅ Enhanced | Allocation Engine + Simulation Engine + Saved Locations |
| 6 | Offline usability | ✅ Enhanced | Workbox SW + Firestore Persistence + Background Sync |

---

## Additional Objectives Introduced During Development

The following objectives emerged during development and represent significant system capabilities not present in the original scope:

### Objective 7 *(New)*
**To implement a machine learning microservice for vegetation-based hive placement forecasting.**
A dedicated FastAPI Python microservice hosts a trained Random Forest Regressor (MAE: 0.0647, R²: 0.71) that predicts future NDVI (vegetation health) 30 days ahead. It exposes a POST `/predict` endpoint consumed by the Node.js backend, producing a 0–100 bloom score, risk classification, and confidence metric for any geographic coordinate.

### Objective 8 *(New)*
**To provide geospatial ML heatmap visualization for landscape-level bloom forecasting.**
A tile-based heatmap system precomputes ML scores across a geographic grid, stores tiles in MongoDB, and renders them as a seamless, high-fidelity WebGL surface on the frontend map. This enables beekeepers to visually identify high-bloom regions at a glance without manually querying individual locations.

### Objective 9 *(New)*
**To implement voice-assisted field inspection logging.**
A voice transcription mode within the inspection workflow allows beekeepers to dictate observations hands-free in the field. Audio recordings are stored in Firebase Storage and automatically transcribed into the inspection record, reducing data entry friction during active hive inspections.

### Objective 10 *(New)*
**To support multi-role access control with an administrative approval workflow.**
The system implements a two-tier role model (Admin / Beekeeper) with a structured onboarding flow: new beekeeper accounts enter a `pending` state and require explicit Admin approval before gaining access to hive data. Admins manage the user registry via a dedicated `AdminDashboard.tsx` interface.

---

*Document last updated: April 2026*
*System: HiveOps – BUZZ-OFF Heritage Apiary Management System*
*Stack: React 19 + TypeScript (Frontend) | Node.js + Express (Backend) | FastAPI + scikit-learn (ML Service) | Firebase Firestore + Storage (Database) | MongoDB (Tile Cache)*
