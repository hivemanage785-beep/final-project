import { apiFetch } from '../lib/api';

export interface ScoredLocation {
  lat: number;
  lng: number;
  score: number;
  monthlyScores?: number[];
  temp?: number;
  humidity?: number;
  rainfall?: number;
  avgTemp?: number;
  avgHumidity?: number;
  avgRain?: number;
}

export interface AllocationPayload {
  locations: ScoredLocation[];
  hiveCount: number;
  currentHiveLocations?: { lat: number; lng: number }[];
  useTimeOptimization?: boolean;
  months?: number;
}

export interface SimulationPayload {
  locations: ScoredLocation[];
  hiveCount: number;
  iterations?: number;
}

export interface SimulationResult {
  random_avg: number;
  optimized_avg: number;
  improvement_percent: number;
  iterations_run: number;
  hive_count: number;
  sample_size: number;
  months_simulated?: number;
}

export async function allocateHives(data: AllocationPayload): Promise<any> {
  return apiFetch('/api/allocate-hives', {
    method: 'POST',
    body: data
  });
}

export async function runSimulation(data: SimulationPayload): Promise<SimulationResult> {
  return apiFetch('/api/simulate', {
    method: 'POST',
    body: data
  });
}
