/**
 * seedFeedbackData.js
 * 
 * Generates 200 realistic feedback entries through the existing API.
 * All data stays within Tamil Nadu bounds and follows real-world
 * beekeeping correlations for outcome prediction.
 * 
 * Usage:
 *   node scripts/seedFeedbackData.js
 * 
 * The script calls POST /api/feedback through the feedbackUX route.
 * Auth token is optional — include one if auth middleware is enabled.
 */

// ─── Configuration ─────────────────────────────────────────────
const API_URL = 'http://localhost:3001/api/feedback';
const TOKEN = 'PASTE_YOUR_AUTH_TOKEN_HERE'; // Replace with a valid Firebase ID token if needed
const TOTAL_ENTRIES = 200;
const DELAY_MS = 75; // ~75ms between requests to avoid overwhelming the server

// ─── Helpers ───────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const rand = (min, max) => +(min + Math.random() * (max - min)).toFixed(4);
const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

/**
 * Determine actual_outcome based on realistic beekeeping heuristics:
 *   - High humidity (>85%)   → bees struggle, nectar diluted  → mostly "Poor"
 *   - High temp (>35°C)      → heat stress, reduced foraging  → mostly "Poor"
 *   - Moderate rain (2–8mm)  → supports flowering             → mostly "Good"
 *   - Otherwise              → balanced random
 */
function deriveOutcome(temp, humidity, rainfall) {
  // High humidity — nectar quality drops
  if (humidity > 85) {
    const r = Math.random();
    return r < 0.65 ? 'Poor' : r < 0.85 ? 'Average' : 'Good';
  }

  // Heat stress
  if (temp > 35) {
    const r = Math.random();
    return r < 0.55 ? 'Poor' : r < 0.85 ? 'Average' : 'Good';
  }

  // Ideal rainfall range — flowering boost
  if (rainfall >= 2 && rainfall <= 8) {
    const r = Math.random();
    return r < 0.60 ? 'Good' : r < 0.85 ? 'Average' : 'Poor';
  }

  // Too much rain — waterlogging
  if (rainfall > 15) {
    const r = Math.random();
    return r < 0.45 ? 'Poor' : r < 0.80 ? 'Average' : 'Good';
  }

  // Balanced conditions
  const r = Math.random();
  return r < 0.35 ? 'Good' : r < 0.70 ? 'Average' : 'Poor';
}

/**
 * Derive a predicted_score that loosely correlates with conditions
 * (mimics what the ML model would output for similar inputs).
 */
function deriveScore(temp, humidity, rainfall) {
  let base = 55;

  // Temperature sweet spot: 24–32°C
  if (temp >= 24 && temp <= 32) base += randInt(5, 15);
  else if (temp > 35) base -= randInt(10, 20);
  else base -= randInt(3, 8);

  // Humidity sweet spot: 50–75%
  if (humidity >= 50 && humidity <= 75) base += randInt(3, 10);
  else if (humidity > 85) base -= randInt(8, 15);

  // Rainfall sweet spot: 2–8mm
  if (rainfall >= 2 && rainfall <= 8) base += randInt(5, 12);
  else if (rainfall > 15) base -= randInt(5, 12);
  else if (rainfall < 0.5) base -= randInt(2, 6);

  // Clamp to valid range
  return Math.max(20, Math.min(90, base));
}

// ─── Tamil Nadu district centroids (for realistic lat/lng clustering) ──
const TN_CLUSTERS = [
  { name: 'Nilgiris',     lat: 11.41, lng: 76.72 },
  { name: 'Coimbatore',   lat: 11.00, lng: 76.96 },
  { name: 'Erode',        lat: 11.34, lng: 77.72 },
  { name: 'Salem',        lat: 11.65, lng: 78.16 },
  { name: 'Madurai',      lat: 9.93,  lng: 78.12 },
  { name: 'Trichy',       lat: 10.79, lng: 78.69 },
  { name: 'Thanjavur',    lat: 10.79, lng: 79.14 },
  { name: 'Dindigul',     lat: 10.37, lng: 77.97 },
  { name: 'Theni',        lat: 10.00, lng: 77.48 },
  { name: 'Tirunelveli',  lat: 8.73,  lng: 77.69 },
  { name: 'Kanyakumari',  lat: 8.18,  lng: 77.41 },
  { name: 'Vellore',      lat: 12.92, lng: 79.13 },
  { name: 'Krishnagiri',  lat: 12.52, lng: 78.21 },
  { name: 'Dharmapuri',   lat: 12.13, lng: 78.16 },
  { name: 'Cuddalore',    lat: 11.75, lng: 79.77 },
  { name: 'Nagapattinam', lat: 10.77, lng: 79.84 },
  { name: 'Sivagangai',   lat: 10.02, lng: 78.52 },
  { name: 'Ramanathapuram', lat: 9.37, lng: 78.83 },
  { name: 'Pudukkottai',  lat: 10.38, lng: 78.82 },
  { name: 'Villupuram',   lat: 11.94, lng: 79.49 },
];

function generateEntry() {
  // Pick a random TN district and add jitter (±0.15°)
  const cluster = TN_CLUSTERS[randInt(0, TN_CLUSTERS.length - 1)];
  const lat = +(cluster.lat + rand(-0.15, 0.15)).toFixed(4);
  const lng = +(cluster.lng + rand(-0.15, 0.15)).toFixed(4);

  // Clamp to TN bounds
  const clampedLat = Math.max(8.0, Math.min(13.5, lat));
  const clampedLng = Math.max(76.0, Math.min(80.5, lng));

  const temperature = rand(20, 38);
  const humidity = rand(40, 95);
  const rainfall = rand(0, 20);
  const predicted_score = deriveScore(temperature, humidity, rainfall);
  const actual_outcome = deriveOutcome(temperature, humidity, rainfall);

  return {
    lat: +clampedLat.toFixed(4),
    lng: +clampedLng.toFixed(4),
    temperature: +temperature.toFixed(1),
    humidity: +humidity.toFixed(1),
    rainfall: +rainfall.toFixed(1),
    predicted_score,
    actual_outcome,
  };
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(`\n🐝  Seeding ${TOTAL_ENTRIES} feedback entries → ${API_URL}\n`);

  let success = 0;
  let failed = 0;
  const outcomes = { Good: 0, Average: 0, Poor: 0 };

  for (let i = 0; i < TOTAL_ENTRIES; i++) {
    const entry = generateEntry();
    outcomes[entry.actual_outcome]++;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (TOKEN && TOKEN !== 'PASTE_YOUR_AUTH_TOKEN_HERE') {
        headers['Authorization'] = `Bearer ${TOKEN}`;
      }

      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(entry),
      });

      if (res.ok) {
        success++;
        console.log(`  ✓ ${i + 1}/${TOTAL_ENTRIES}  |  ${entry.actual_outcome.padEnd(7)}  |  score: ${entry.predicted_score}  |  ${entry.lat}°N, ${entry.lng}°E`);
      } else {
        const body = await res.text();
        failed++;
        console.error(`  ✗ ${i + 1}/${TOTAL_ENTRIES}  |  HTTP ${res.status}: ${body.slice(0, 120)}`);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${i + 1}/${TOTAL_ENTRIES}  |  Network error: ${err.message}`);
    }

    await delay(DELAY_MS);
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`  Total:    ${TOTAL_ENTRIES}`);
  console.log(`  Success:  ${success}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Good:     ${outcomes.Good}`);
  console.log(`  Average:  ${outcomes.Average}`);
  console.log(`  Poor:     ${outcomes.Poor}`);
  console.log(`─────────────────────────────────────────\n`);
}

main();
