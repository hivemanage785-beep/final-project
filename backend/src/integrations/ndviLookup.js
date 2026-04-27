import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDataPath = path.resolve(__dirname, '../../../ml-service/flowering_dataset_full_tn1.csv');

let records = [];
let monthlyAverage = {};

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
    const latIdx = headers.indexOf('lat');
    const lonIdx = headers.indexOf('lon');
    const monthIdx = headers.indexOf('month');
    const ndviIdx = headers.indexOf('NDVI');

    if (latIdx === -1 || lonIdx === -1 || monthIdx === -1 || ndviIdx === -1) {
        console.error('Invalid NDVI dataset headers');
        return;
    }

    const monthSums = {};
    const monthCounts = {};

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        const lat = parseFloat(parts[latIdx]);
        const lon = parseFloat(parts[lonIdx]);
        const month = parseInt(parts[monthIdx], 10);
        const ndvi = parseFloat(parts[ndviIdx]);

        if (!isNaN(lat) && !isNaN(lon) && !isNaN(month) && !isNaN(ndvi)) {
            records.push({ lat, lon, month, ndvi });

            if (!monthSums[month]) {
                monthSums[month] = 0;
                monthCounts[month] = 0;
            }
            monthSums[month] += ndvi;
            monthCounts[month]++;
        }
    }

    for (const m in monthSums) {
        monthlyAverage[m] = monthSums[m] / monthCounts[m];
    }
}

loadDataset();

export function getNDVI(lat, lng, month) {
    const rLat = parseFloat(Number(lat).toFixed(2));
    const rLng = parseFloat(Number(lng).toFixed(2));
    const m = parseInt(month, 10);

    let bestDist = Infinity;
    let closestNdvi = null;

    for (const r of records) {
        if (r.month === m) {
            if (r.lat === rLat && r.lon === rLng) {
                return r.ndvi;
            }

            const d = Math.sqrt(Math.pow(r.lat - rLat, 2) + Math.pow(r.lon - rLng, 2));
            if (d < bestDist && d <= 0.2) {
                bestDist = d;
                closestNdvi = r.ndvi;
            }
        }
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
