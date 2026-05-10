import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDataPath = path.resolve(__dirname, '../../../ml-service/flowering_dataset_full_tn1.csv');

let records = [];         // { lat, lon, month, ndvi, temp, humidity, rainfall }
let monthlyAverage = {}; // NDVI monthly averages (for NDVI last-resort fallback)
let monthlyClimate = {}; // climate normals per month from dataset { avgTemp, avgRain, avgHumidity }

function loadDataset() {
    const dataPath = process.env.NDVI_DATASET_PATH || defaultDataPath;
    try {
        if (!fs.existsSync(dataPath)) {
            // fallback generic path lookup just in case
            const altPath = path.resolve(process.cwd(), '../ml-service/flowering_dataset_full_tn1.csv');
            if (fs.existsSync(altPath)) {
                return loadFromPath(altPath);
            }
            console.warn("NDVI Dataset not found at: " + dataPath);
            return;
        }
        loadFromPath(dataPath);
    } catch (e) {
        console.error("Failed to load NDVI dataset:", e.message);
    }
}

function loadFromPath(dataPath) {
    const csvData = fs.readFileSync(dataPath, 'utf8');
    const lines = csvData.split(/\r?\n/);
    if (lines.length === 0) return;

    const headers = lines[0].split(',');
    const latIdx      = headers.indexOf('lat');
    const lonIdx      = headers.indexOf('lon');
    const monthIdx    = headers.indexOf('month');
    const ndviIdx     = headers.indexOf('NDVI');
    const tempIdx     = headers.indexOf('temp');
    const humidIdx    = headers.indexOf('humidity');
    const rainIdx     = headers.indexOf('rainfall');

    if (latIdx === -1 || lonIdx === -1 || monthIdx === -1 || ndviIdx === -1) {
        console.error('Invalid NDVI dataset headers');
        return;
    }

    // Per-month accumulators for NDVI and climate normals
    const monthSums   = {};
    const monthCounts = {};
    const climateSums = {}; // { [month]: { temp, humidity, rainfall, count } }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts    = line.split(',');
        const lat      = parseFloat(parts[latIdx]);
        const lon      = parseFloat(parts[lonIdx]);
        const month    = parseInt(parts[monthIdx], 10);
        const ndvi     = parseFloat(parts[ndviIdx]);
        const temp     = tempIdx    !== -1 ? parseFloat(parts[tempIdx])    : NaN;
        const humidity = humidIdx   !== -1 ? parseFloat(parts[humidIdx])   : NaN;
        const rainfall = rainIdx    !== -1 ? parseFloat(parts[rainIdx])    : NaN;

        if (!isNaN(lat) && !isNaN(lon) && !isNaN(month) && !isNaN(ndvi)) {
            records.push({ lat, lon, month, ndvi, temp, humidity, rainfall });

            // NDVI monthly average
            if (!monthSums[month]) { monthSums[month] = 0; monthCounts[month] = 0; }
            monthSums[month]  += ndvi;
            monthCounts[month]++;

            // Climate monthly sums (only when weather columns exist)
            if (!isNaN(temp) && !isNaN(humidity) && !isNaN(rainfall)) {
                if (!climateSums[month]) climateSums[month] = { temp: 0, humidity: 0, rainfall: 0, count: 0 };
                climateSums[month].temp     += temp;
                climateSums[month].humidity += humidity;
                climateSums[month].rainfall += rainfall;
                climateSums[month].count++;
            }
        }
    }

    for (const m in monthSums) {
        monthlyAverage[m] = monthSums[m] / monthCounts[m];
    }

    for (const m in climateSums) {
        const s = climateSums[m];
        monthlyClimate[m] = {
            avgTemp:     Number((s.temp     / s.count).toFixed(2)),
            avgHumidity: Number((s.humidity / s.count).toFixed(2)),
            avgRain:     Number((s.rainfall / s.count).toFixed(2)),
        };
    }

    console.info(`[NDVI Dataset] Loaded ${records.length} records. Climate normals built for months: ${Object.keys(monthlyClimate).join(',')}`);
}

loadDataset();

export function getNDVI(lat, lng, month) {
    const qLat = Number(lat);
    const qLng = Number(lng);
    const m = parseInt(month, 10);

    let bestDist = Infinity;
    let closestNdvi = null;

    // Primary search: ±0.15° radius (covers dataset edge cases like lng 80.10 → nearest 80.00)
    for (const r of records) {
        if (r.month === m) {
            const dLat = Math.abs(r.lat - qLat);
            const dLng = Math.abs(r.lon - qLng);
            if (dLat <= 0.15 && dLng <= 0.15) {
                const d = Math.sqrt(dLat * dLat + dLng * dLng);
                if (d < bestDist) {
                    bestDist = d;
                    closestNdvi = r.ndvi;
                }
            }
        }
    }

    // Fallback: widen to ±0.5° if still no match (handles coastal/border coordinates)
    if (closestNdvi === null) {
        for (const r of records) {
            if (r.month === m) {
                const dLat = Math.abs(r.lat - qLat);
                const dLng = Math.abs(r.lon - qLng);
                if (dLat <= 0.5 && dLng <= 0.5) {
                    const d = Math.sqrt(dLat * dLat + dLng * dLng);
                    if (d < bestDist) {
                        bestDist = d;
                        closestNdvi = r.ndvi;
                    }
                }
            }
        }
    }

    // Last resort: return the monthly average for the region
    if (closestNdvi === null && monthlyAverage[m] !== undefined) {
        closestNdvi = Number(monthlyAverage[m].toFixed(4));
    }

    return closestNdvi;
}

export function getNDVITrend(lat, lng, month) {
    const m = parseInt(month, 10);
    const current = getNDVI(lat, lng, m);
    const prevMonth = m === 1 ? 12 : m - 1;
    const previous = getNDVI(lat, lng, prevMonth);
    
    if (current === null || previous === null) return null;
    return Number((current - previous).toFixed(5));
}

/**
 * Returns real climate normals (avgTemp, avgRain, avgHumidity) for a given month
 * derived directly from the local NDVI dataset CSV, using an inverse-distance-weighted
 * average of all records within ±0.5° of the query coordinate.
 *
 * This is used as the secondary fallback in generateMonthlyScores() when the
 * Open-Meteo archive API is unavailable. It requires zero internet access and
 * is always available as long as the dataset file is present.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} month - 1-12
 * @returns {{ avgTemp, avgRain, avgHumidity, source: 'local-dataset', recordCount: number } | null}
 */
export function getMonthlyClimateFromDataset(lat, lng, month) {
    const qLat = Number(lat);
    const qLng = Number(lng);
    const m    = parseInt(month, 10);

    // Collect nearby records with valid weather data
    const nearby = [];
    for (const r of records) {
        if (r.month !== m) continue;
        if (isNaN(r.temp) || isNaN(r.humidity) || isNaN(r.rainfall)) continue;

        const dLat = Math.abs(r.lat - qLat);
        const dLng = Math.abs(r.lon - qLng);
        if (dLat <= 0.5 && dLng <= 0.5) {
            const dist = Math.sqrt(dLat * dLat + dLng * dLng) || 0.0001; // avoid div/0
            nearby.push({ temp: r.temp, humidity: r.humidity, rainfall: r.rainfall, dist });
        }
    }

    // Widen to full dataset if no nearby records (rare edge case)
    if (nearby.length === 0) {
        const global = monthlyClimate[m];
        if (!global) return null;
        return { ...global, source: 'local-dataset-global-avg', recordCount: 0 };
    }

    // Inverse-distance-weighted average for better spatial accuracy
    let wTemp = 0, wHumid = 0, wRain = 0, wSum = 0;
    for (const r of nearby) {
        const w = 1 / r.dist;
        wTemp  += r.temp     * w;
        wHumid += r.humidity * w;
        wRain  += r.rainfall * w;
        wSum   += w;
    }

    return {
        avgTemp:     Number((wTemp  / wSum).toFixed(2)),
        avgHumidity: Number((wHumid / wSum).toFixed(2)),
        avgRain:     Number((wRain  / wSum).toFixed(2)),
        source:      'local-dataset',
        recordCount: nearby.length,
    };
}
