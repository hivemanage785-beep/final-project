import Tile from '../models/Tile.js';
import { latLngToTile, getTileBounds, createGridFromPoints } from '../utils/tileUtils.js';

async function generateTiles(points, zoomLevels, resolution, month) {
  if (!points || points.length === 0) return;

  points = points.filter((p) => p[0] != null && p[1] != null && p[2] != null && !isNaN(p[2]));

    // Log omitted for cleanliness

  for (const zoom of zoomLevels) {
    const tileGroups = {};

    for (const [lat, lng, score] of points) {
      const { x, y } = latLngToTile(lat, lng, zoom);
      const key = `${x},${y}`;
      if (!tileGroups[key]) {
        tileGroups[key] = [];
      }
      // Normalize ML score (0–100) → (0–1) before storing
      const normalized = score / 100;
      tileGroups[key].push([lat, lng, normalized]);
    }

    const bulkOps = [];

    // ── AUDIT: Accumulators for final report
    let totalPointsAcrossTiles = 0;
    let totalFilledCells = 0;
    let tilesWithZeroData = 0;
    const totalCellsPerTile = resolution * resolution;

    for (const key in tileGroups) {
      const [xStr, yStr] = key.split(',');
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);
      const tilePoints = tileGroups[key];

      const bounds = getTileBounds(x, y, zoom);

      // ── AUDIT: Step 3 — Point count inside this tile bounds
      const { lat_min, lat_max, lng_min, lng_max } = bounds;
      const inBoundsCount = points.filter(p =>
        p[0] >= lat_min && p[0] <= lat_max &&
        p[1] >= lng_min && p[1] <= lng_max
      ).length;
      totalPointsAcrossTiles += inBoundsCount;


      const grid = createGridFromPoints(tilePoints, resolution, bounds);

      // ── AUDIT: Step 4 — Count filled (non-zero) cells
      let filled = 0;
      let gMin = Infinity, gMax = -Infinity;
      for (const row of grid) {
        for (const val of row) {
          if (val > 0) filled++;
          if (val < gMin) gMin = val;
          if (val > gMax) gMax = val;
        }
      }
      totalFilledCells += filled;
      if (filled === 0) tilesWithZeroData++;



      // ── AUDIT: Step 5 — Detect failure
      if (inBoundsCount < 3 || filled === 0) {
        console.log(`ERROR: grid not being populated [z=${zoom} x=${x} y=${y}] — points=${inBoundsCount} filled=${filled}`);
      }

      bulkOps.push({
        updateOne: {
          filter: { z: zoom, x, y, month },
          update: { $set: { grid, gridSize: resolution, createdAt: new Date() } },
          upsert: true
        }
      });
    }

    // ── AUDIT: Step 7 — Final report per zoom level
    const tileCount = Object.keys(tileGroups).length;
    const avgPointsPerTile = tileCount > 0 ? (totalPointsAcrossTiles / tileCount).toFixed(1) : 0;
    const avgFilledCells = tileCount > 0 ? (totalFilledCells / tileCount).toFixed(1) : 0;
    if (tilesWithZeroData > tileCount / 2) {
      console.warn(`[tileGenerator] z=${zoom}: Sparse data or bug detected. Avg points: ${avgPointsPerTile}`);
    }

    if (bulkOps.length > 0) {
      await Tile.bulkWrite(bulkOps);
    }
  }
}

export { generateTiles };
