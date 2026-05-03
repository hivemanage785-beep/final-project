import axios from 'axios';
import { generateTiles } from '../services/tileGenerator.js';
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// ─────────────────────────────────────────────────────────────
// GRID — full Tamil Nadu bounding box
//   lat: 8.0 – 13.5   (south coast → north border)
//   lng: 76.0 – 80.5  (Western Ghats → Bay of Bengal)
//   step: 0.15° → ~16 km spacing, ~1600 points total
// ─────────────────────────────────────────────────────────────
function generateInputGrid() {
  const points = [];
  const LAT_START = 8.0,  LAT_END = 13.5;
  const LNG_START = 76.0, LNG_END = 80.5;
  const STEP = 0.15;

  for (let lat = LAT_START; lat <= LAT_END + 1e-9; lat += STEP) {
    for (let lng = LNG_START; lng <= LNG_END + 1e-9; lng += STEP) {
      points.push({
        lat: Math.round(lat * 1000) / 1000,
        lng: Math.round(lng * 1000) / 1000
      });
    }
  }
  return points;
}

// ─────────────────────────────────────────────────────────────
// CLIMATE ESTIMATION
// Realistic synthetic climate that varies across Tamil Nadu:
//   • Temp:     hotter in dry north-east plains, cooler in Western Ghats
//   • Humidity: higher near coast (east) and Western Ghats (west)
//   • Rainfall: highest on eastern coast and hills, dry interior
// ─────────────────────────────────────────────────────────────
function estimateClimate(lat, lng, month) {
  // Temperature: base 26°C, +4 for southern plains, -5 for highlands
  const latFactor  = (lat - 10.5) * -0.8;   // cooler northward (hills)
  const lngFactor  = (lng - 78.0) *  0.5;   // hotter east (plains)
  // Seasonal swing: hot in Mar–Jun, cooler in Dec–Jan
  const seasonal   = Math.sin((month - 3) * Math.PI / 6) * 5;
  const temp = Math.min(44, Math.max(15, 28 + latFactor + lngFactor + seasonal));

  // Humidity: western coast & hills moist; dry interior
  const coastProx  = Math.max(0, (80.5 - lng) / 4.5);  // 0=coast, 1=west
  const ghatsBoost = lng < 77.5 ? 15 : 0;               // Western Ghats
  const monsoon    = (month >= 6 && month <= 11) ? 20 : 0;
  const humidity   = Math.min(98, Math.max(25, 55 + coastProx * 20 + ghatsBoost + monsoon));

  // Rainfall: heavy monsoon east (Oct–Dec), south-west (Jun–Sep)
  const swMonsoon  = (month >= 6  && month <= 9)  ? (lng < 77.5 ? 40 : 10) : 0;
  const neMonsoon  = (month >= 10 && month <= 12) ? (lng > 79.0 ? 45 : 15) : 0;
  const summer     = (month >= 3  && month <= 5)  ? 3 : 0;
  const rainfall   = Math.max(0, swMonsoon + neMonsoon + summer + (Math.random() * 4 - 2));

  return { temp, humidity, rainfall };
}

// ─────────────────────────────────────────────────────────────
// CALL ML BULK ENDPOINT — features: temp, humidity, rainfall, lat, lng, month
// NO ndvi passed (new model does not use it)
// ─────────────────────────────────────────────────────────────
async function fetchMLPoints(month) {
  const locations = generateInputGrid();

  const payload = locations.map(pt => {
    const { temp, humidity, rainfall } = estimateClimate(pt.lat, pt.lng, month);
    return {
      lat:      pt.lat,
      lng:      pt.lng,
      temp,
      humidity,
      rainfall,
      month
    };
  });

    // Logging inputs removed for cleaner output

  // Chunk into batches of 500 to avoid oversized requests
  const BATCH = 500;
  const results = [];
  for (let i = 0; i < payload.length; i += BATCH) {
    const chunk = payload.slice(i, i + BATCH);
    let mlUrl = process.env.ML_SERVICE_URL;
    if (!mlUrl) throw new Error("ML_SERVICE_URL is not configured");
    mlUrl = mlUrl.replace(/\/$/, "");
    const res = await axios.post(`${mlUrl}/predict-bulk`, { points: chunk });
    results.push(...res.data.results);
  }

  // Map back to [lat, lng, score]
  return locations.map((pt, i) => ({
    lat:   pt.lat,
    lng:   pt.lng,
    score: results[i] ? results[i].score : 0
  }));
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function runTileGeneration() {
  console.log('Running offline ML tile generation (full Tamil Nadu, all 12 months)...');

  try {
    await connectDB();

    const GRID_SIZE = parseInt(process.env.GRID_SIZE, 10) || 32;
    console.log(`Using GRID_SIZE = ${GRID_SIZE}`);

    for (let month = 1; month <= 12; month++) {
      console.log(`\n--- Month ${month}/12 ---`);

      const mlResults = await fetchMLPoints(month);
      const points    = mlResults.map(p => [p.lat, p.lng, p.score]);

      // Score audit
      const scores   = points.map(p => p[2]);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      console.log(`  ML SCORE MIN: ${minScore}  MAX: ${maxScore}  RANGE: ${maxScore - minScore}`);

      if (minScore === 0 && maxScore === 0) {
        console.error(`  ERROR: ML returning all zeros for month ${month} — skipping`);
        continue;
      }

      await generateTiles(points, [6, 8, 10], GRID_SIZE, month);
      console.log(`  Month ${month} tiles written.`);
    }

    console.log('\nAll 12 months tile generation complete.');

  } catch (error) {
    console.error('Error during tile generation:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      // await mongoose.disconnect(); // Do not disconnect if called from server startup!
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('generateTiles.js')) {
  runTileGeneration();
}

export { runTileGeneration };
