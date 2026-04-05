import Dexie, { Table } from 'dexie';
import { HeatmapPoint } from '../types/score';

export interface CachedHeatmap {
  month: number;
  points: HeatmapPoint[];
  cachedAt: number;
}

export class HeatmapDatabase extends Dexie {
  heatmap!: Table<CachedHeatmap>;

  constructor() {
    super('HeatmapCache');
    this.version(1).stores({
      heatmap: 'month' // Primary key
    });
  }
}

export const db = new HeatmapDatabase();

const CACHE_TTL = 3600 * 1000; // 1 hour

export async function getCachedHeatmap(month: number): Promise<HeatmapPoint[] | null> {
  try {
    const cached = await db.heatmap.get(month);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.cachedAt > CACHE_TTL;
    if (isExpired) {
      console.warn(`Heatmap cache for month ${month} expired.`);
      return null;
    }
    
    return cached.points;
  } catch (e) {
    console.error('Failed to read heatmap cache:', e);
    return null;
  }
}

export async function setCachedHeatmap(month: number, points: HeatmapPoint[]) {
  try {
    await db.heatmap.put({
      month,
      points,
      cachedAt: Date.now()
    });
  } catch (e) {
    console.error('Failed to write heatmap cache:', e);
  }
}
