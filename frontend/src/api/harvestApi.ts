import { apiFetch } from '../lib/api';

export interface Harvest {
  _id: string;
  batch_id: string;
  hive_id: string;
  beekeeper_id: string;
  quantity_kg: number;
  harvest_date: string;
  honey_type?: string;
  notes?: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CreateHarvestData {
  hive_id: string;
  quantity_kg: number;
  harvest_date?: string;
  honey_type?: string;
  notes?: string;
}

export interface TraceData {
  batch: Harvest;
  beekeeper: {
    name: string;
    location?: string;
  };
  hive: {
    hive_id: string;
    location: string;
  };
}

export async function createHarvest(data: CreateHarvestData): Promise<Harvest> {
  return apiFetch('/api/harvests', {
    method: 'POST',
    body: data
  });
}

export async function fetchMyHarvests(): Promise<Harvest[]> {
  return apiFetch('/api/harvests');
}

export async function verifyBatch(batchId: string, status: 'verified' | 'rejected'): Promise<{ success: boolean }> {
  return apiFetch('/api/harvests/verify', {
    method: 'POST',
    body: { batch_id: batchId, status }
  });
}

export async function traceBatch(batchId: string): Promise<TraceData> {
  return apiFetch(`/api/harvests/trace/${batchId}`);
}
