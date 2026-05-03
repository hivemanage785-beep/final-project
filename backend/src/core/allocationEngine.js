import { logger } from '../utils/logger.js';

const MOVEMENT_PENALTY_PER_KM = 0.05;

/**
 * Returns the great-circle distance in kilometres between two lat/lng points.
 * Uses the Haversine formula — no external libraries required.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in km
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;                         // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Selects the optimal hive placement locations from a scored candidate list.
 *
 * @param {Array<{lat: number, lng: number, score: number}>} locations
 *   All candidate locations with their ML-derived scores (0–100).
 *
 * @param {number} hiveCount
 *   How many hive placement locations to select.
 *
 * @param {Array<{lat: number, lng: number}>} [currentHiveLocations]
 *   Optional. Current hive positions. If provided, a movement penalty is
 *   applied to each selected candidate based on its distance from the
 *   nearest existing hive.
 *
 * @returns {Array<{lat: number, lng: number, score: number, adjusted_score: number}>}
 *   The selected locations sorted by adjusted_score descending.
 *   `score`          — raw ML score (unchanged).
 *   `adjusted_score` — score after movement penalty (clamped to 0).
 */
export function allocateHives(locations, hiveCount, currentHiveLocations = []) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return [];
  }

  const n = Math.max(0, Math.floor(hiveCount));
  if (n === 0) return [];

  const hasCurrent = Array.isArray(currentHiveLocations) && currentHiveLocations.length > 0;

  const valid = locations.filter(
    (loc) =>
      loc != null &&
      typeof loc.lat === 'number' && isFinite(loc.lat) &&
      typeof loc.lng === 'number' && isFinite(loc.lng) &&
      typeof loc.score === 'number' && isFinite(loc.score)
  );

  if (valid.length === 0) return [];

  const sorted = [...valid].sort((a, b) => b.score - a.score);

  const selected = sorted.slice(0, n);

  const result = selected.map((loc) => {
    let penalty = 0;

    if (hasCurrent) {
      let minDistKm = Infinity;
      for (const cur of currentHiveLocations) {
        if (
          cur == null ||
          typeof cur.lat !== 'number' || !isFinite(cur.lat) ||
          typeof cur.lng !== 'number' || !isFinite(cur.lng)
        ) {
          continue;
        }
        const dist = haversineKm(cur.lat, cur.lng, loc.lat, loc.lng);
        if (dist < minDistKm) minDistKm = dist;
      }

      if (isFinite(minDistKm)) {
        penalty = minDistKm * MOVEMENT_PENALTY_PER_KM;
      }
    }

    const adjusted_score = Math.max(0, parseFloat((loc.score - penalty).toFixed(2)));

    return {
      lat: loc.lat,
      lng: loc.lng,
      score: loc.score,
      adjusted_score,
    };
  });

  result.sort((a, b) => b.adjusted_score - a.adjusted_score);

  return result;
}

const TOP_K_MAX = 10;
const MAX_PATHS = 10000;
function getEffectiveScore(loc) {
  if (!Array.isArray(loc.monthlyScores) || loc.monthlyScores.length === 0) {
    logger.warn(`[Allocation] monthlyScores missing for loc(${loc.lat},${loc.lng}) — using static score`);
    return typeof loc.score === 'number' && isFinite(loc.score) ? loc.score : 0;
  }
  const sum = loc.monthlyScores.reduce((s, v) => s + (isFinite(v) ? v : 0), 0);
  return sum / loc.monthlyScores.length;
}

function getScoreForMonth(loc, monthIndex) {
  if (!Array.isArray(loc.monthlyScores) || loc.monthlyScores.length <= monthIndex) {
    logger.warn(`[Allocation] monthlyScores[${monthIndex}] missing for loc(${loc.lat},${loc.lng}) — clamping`);
    if (Array.isArray(loc.monthlyScores) && loc.monthlyScores.length > 0) {
      const v = loc.monthlyScores[loc.monthlyScores.length - 1];
      return typeof v === 'number' && isFinite(v) ? v : 0;
    }
    return typeof loc.score === 'number' && isFinite(loc.score) ? loc.score : 0;
  }
  const v = loc.monthlyScores[monthIndex];
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

export function distance(lat1, lng1, lat2, lng2) {
  return haversineKm(lat1, lng1, lat2, lng2);
}
/**
 * Returns the top-K locations ranked by effective score
 * (mean of monthlyScores when present, else .score).
 *
 * @param {Array<{lat, lng, score?, monthlyScores?}>} locations
 * @param {number} k
 * @returns {Array}
 */
export function getTopKLocations(locations, k) {
  if (!Array.isArray(locations) || locations.length === 0) return [];
  const safeK = Math.max(1, Math.floor(k));
  return [...locations]
    .sort((a, b) => getEffectiveScore(b) - getEffectiveScore(a))
    .slice(0, safeK);
}

/**
 * Selects multi-month movement plans for hiveCount hives using bounded path search.
 *
 * Algorithm:
 *   1. Per month t, rank all candidates by score at month t; keep top-K.
 *      K is dynamically reduced so K^months ≤ MAX_PATHS (10,000).
 *   2. Enumerate all K^months paths iteratively (no recursion).
 *   3. For each hive (0..hiveCount-1):
 *      - Score every path from that hive's current position (if provided).
 *        path_score = Σ(monthly score) − Σ(dist(prev, step) × MOVEMENT_PENALTY_PER_KM)
 *      - Assign the best-scoring path whose month-1 start is not yet claimed.
 *      - Claim that start key so the next hive cannot collocate at month 1.
 *
 * @param {Array<{lat, lng, score?, monthlyScores?}>} locations
 *   Candidates. monthlyScores[t] is the predicted score for month t+1.
 *   If absent, .score is used for all months.
 *
 * @param {number} hiveCount
 *   Number of hives to plan.
 *
 * @param {Array<{lat, lng}>} [currentHiveLocations=[]]
 *   Current position indexed by hive. Used to penalise the current→month1 move.
 *   Missing entries or null treated as no prior position.
 *
 * @param {number} [months=3]
 *   Planning horizon. Capped internally; effective K shrinks as months grows.
 *
 * @returns {{
 *   recommendations: Array<{
 *     hiveIndex:   number,
 *     plan:        Array<{month: number, lat: number, lng: number, score: number}>,
 *     total_score: number
 *   }>
 * }}
 */
export function optimizeOverTime(locations, hiveCount, currentHiveLocations = [], months = 3) {

  // ── 1. Guard and normalise inputs ─────────────────────────────────────────
  const safeMonths = Math.min(Math.max(1, Math.floor(months)), 12);
  const safeHiveCount = Math.max(0, Math.floor(hiveCount));

  const valid = Array.isArray(locations)
    ? locations.filter(loc =>
      loc != null &&
      typeof loc.lat === 'number' && isFinite(loc.lat) &&
      typeof loc.lng === 'number' && isFinite(loc.lng) &&
      (
        (Array.isArray(loc.monthlyScores) && loc.monthlyScores.length > 0) ||
        (typeof loc.score === 'number' && isFinite(loc.score))
      )
    )
    : [];

  if (valid.length === 0 || safeHiveCount === 0) {
    return { recommendations: [] };
  }

  // ── 2. Compute effective K so total paths never exceed MAX_PATHS ──────────
  // effectiveK = min(TOP_K_MAX, floor(MAX_PATHS ^ (1 / months)))
  // e.g. months=3 → K≤21→10; months=6 → K≤4; months=12 → K≤2
  const effectiveK = Math.min(
    TOP_K_MAX,
    Math.max(1, Math.floor(Math.pow(MAX_PATHS, 1 / safeMonths)))
  );

  // ── 3. Build per-month candidate sets (top-K by month-t score) ───────────
  const candidatesPerMonth = [];

  for (let t = 0; t < safeMonths; t++) {
    const sorted = [...valid].sort(
      (a, b) => getScoreForMonth(b, t) - getScoreForMonth(a, t)
    );
    candidatesPerMonth.push(
      sorted.slice(0, effectiveK).map(loc => ({
        lat: loc.lat,
        lng: loc.lng,
        score: getScoreForMonth(loc, t),
      }))
    );
  }

  // ── 4. Enumerate all paths iteratively — O(effectiveK ^ safeMonths) ───────
  // paths is an array of month-step arrays: [[step0, step1, ...], ...]
  let paths = candidatesPerMonth[0].map(loc => [loc]); // seed from month-0

  for (let t = 1; t < safeMonths; t++) {
    const expanded = [];
    for (const existingPath of paths) {
      for (const loc of candidatesPerMonth[t]) {
        expanded.push([...existingPath, loc]);
      }
    }
    paths = expanded;
  }

  // ── 5. Assign plans to hives — each scored against that hive's current pos ─
  const usedStartKeys = new Set(); // month-1 location keys already assigned
  const recommendations = [];

  for (let hiveIndex = 0; hiveIndex < safeHiveCount; hiveIndex++) {

    // Retrieve this hive's current position safely
    const curEntry = Array.isArray(currentHiveLocations) ? currentHiveLocations[hiveIndex] : null;
    const curPos =
      curEntry != null &&
        typeof curEntry.lat === 'number' && isFinite(curEntry.lat) &&
        typeof curEntry.lng === 'number' && isFinite(curEntry.lng)
        ? curEntry
        : null;

    let bestPath = null;
    let bestScore = -Infinity;

    for (const path of paths) {
      // Enforce spatial diversity: skip paths sharing a month-1 start already claimed
      const startKey = `${path[0].lat.toFixed(4)}:${path[0].lng.toFixed(4)}`;
      if (usedStartKeys.has(startKey)) continue;

      // Score: Σ monthly scores − Σ movement costs between consecutive positions
      let totalScore = 0;
      let prev = curPos; // null when this hive has no current position

      for (const step of path) {
        totalScore += step.score;
        if (prev !== null) {
          const distKm = haversineKm(prev.lat, prev.lng, step.lat, step.lng);
          totalScore -= distKm * MOVEMENT_PENALTY_PER_KM;
        }
        prev = step;
      }

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestPath = path;
      }
    }

    // No distinct starting location available (hiveCount > distinct candidates)
    if (bestPath === null) break;

    usedStartKeys.add(`${bestPath[0].lat.toFixed(4)}:${bestPath[0].lng.toFixed(4)}`);

    recommendations.push({
      hiveIndex,
      plan: bestPath.map((step, t) => ({
        month: t + 1,
        lat: step.lat,
        lng: step.lng,
        score: parseFloat(step.score.toFixed(2)),
      })),
      total_score: parseFloat(bestScore.toFixed(2)),
    });
  }

  return { recommendations };
}
