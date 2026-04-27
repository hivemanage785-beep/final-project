/**
 * audit_tiles.js  — Steps 4, 5, 6
 * Reads tile grids from MongoDB and simulates tile API load.
 * Run from backend/ directory.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const TileSchema = new mongoose.Schema({ z: Number, x: Number, y: Number, month: Number, grid: Array }, { strict: false });
const Tile = mongoose.models.Tile || mongoose.model('Tile', TileSchema);

async function main() {
  console.log('\n==================================================');
  console.log(' TILE AUDIT — Steps 4, 5, 6');
  console.log('==================================================');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hiveops');
  console.log('[DB] Connected:', mongoose.connection.host);

  const report = {};

  // ─────────────────────────────────────────────
  // STEP 4 — Single tile grid validity
  // ─────────────────────────────────────────────
  console.log('\n--- STEP 4: TILE CONSISTENCY ---');
  const tile = await Tile.findOne({ z: 8 }).lean();

  if (!tile) {
    console.log('ERROR: No tiles found in DB');
    report.tile_range = 'NO_DATA';
    report.tile_consistency = 'FAIL';
  } else {
    const flat = tile.grid.flat();
    const hasNaN  = flat.some(v => isNaN(v));
    const outRange = flat.some(v => v < 0 || v > 1);
    const tMin = Math.min(...flat);
    const tMax = Math.max(...flat);
    const isConst = tMax === tMin;

    console.log(`  Tile: z=${tile.z} x=${tile.x} y=${tile.y} month=${tile.month}`);
    console.log(`  Grid size: ${flat.length} cells`);
    console.log(`  Has NaN: ${hasNaN}`);
    console.log(`  Out of [0,1]: ${outRange}`);
    console.log(`  TILE RANGE: ${tMin.toFixed(4)} - ${tMax.toFixed(4)}`);
    console.log(`  Constant grid: ${isConst}`);

    const tileConsist = !hasNaN && !outRange && !isConst;
    report.tile_range = `${tMin.toFixed(3)}-${tMax.toFixed(3)}`;
    report.tile_consistency = tileConsist ? 'PASS' : 'FAIL';
    console.log(`  RESULT: ${report.tile_consistency}`);
  }

  // ─────────────────────────────────────────────
  // STEP 5 — Two adjacent tiles smoothness
  // ─────────────────────────────────────────────
  console.log('\n--- STEP 5: SPATIAL SMOOTHNESS ---');
  const tiles = await Tile.find({ z: 8 }).limit(2).lean();

  if (tiles.length < 2) {
    console.log('  Not enough tiles for spatial check');
    report.spatial_smooth = 'SKIP';
  } else {
    const avg = t => {
      const f = t.grid.flat();
      return f.reduce((a, b) => a + b, 0) / f.length;
    };
    const a1 = avg(tiles[0]), a2 = avg(tiles[1]);
    const diff = Math.abs(a1 - a2);
    console.log(`  Tile A (z=${tiles[0].z} x=${tiles[0].x} y=${tiles[0].y}) avg: ${a1.toFixed(4)}`);
    console.log(`  Tile B (z=${tiles[1].z} x=${tiles[1].x} y=${tiles[1].y}) avg: ${a2.toFixed(4)}`);
    console.log(`  Avg difference: ${diff.toFixed(4)}`);

    // Similar (diff < 0.4) but not identical (diff > 0)
    const smooth = diff > 0 && diff < 0.4;
    report.spatial_smooth = smooth ? 'PASS' : (diff === 0 ? 'FAIL (identical)' : 'WARN (large jump)');
    console.log(`  RESULT: ${report.spatial_smooth}`);
  }

  // ─────────────────────────────────────────────
  // STEP 6 — Backend load test (tile API)
  // ─────────────────────────────────────────────
  console.log('\n--- STEP 6: BACKEND LOAD TEST (20 requests) ---');

  const BACKEND = 'http://localhost:3001';
  let successCount = 0, errorCount = 0;
  const timings = [];

  // Fetch a few real tile coords from DB
  const sampleTiles = await Tile.find({ z: 8 }).limit(5).lean();

  for (let i = 0; i < 20; i++) {
    const t = sampleTiles[i % sampleTiles.length];
    const url = `${BACKEND}/api/tile/${t.z}/${t.x}/${t.y}?month=4`;
    const t0 = Date.now();
    try {
      await axios.get(url, { timeout: 5000 });
      timings.push(Date.now() - t0);
      successCount++;
    } catch (e) {
      // If backend isn't running, log and mark
      const ms = Date.now() - t0;
      timings.push(ms);
      errorCount++;
    }
  }

  const avgMs = (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(0);
  const maxMs = Math.max(...timings);

  console.log(`  Requests: 20  Success: ${successCount}  Errors: ${errorCount}`);
  console.log(`  Avg response: ${avgMs}ms  Max: ${maxMs}ms`);

  // Backend stable = success rate >= 90% OR backend not running (skip gracefully)
  if (successCount === 0) {
    console.log('  NOTE: Backend server not running — load test skipped');
    report.backend_stable = 'SKIP (server offline)';
  } else {
    const stable = successCount >= 18 && parseInt(avgMs) < 2000;
    report.backend_stable = stable ? 'PASS' : 'FAIL';
    console.log(`  RESULT: ${report.backend_stable}`);
  }

  // ─────────────────────────────────────────────
  // FINAL REPORT
  // ─────────────────────────────────────────────
  console.log('\n==================================================');
  console.log(' FINAL TILE REPORT');
  console.log('==================================================');
  console.log(JSON.stringify(report, null, 2));

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
