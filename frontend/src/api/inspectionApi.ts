import { apiFetch } from '../lib/api';

export interface Inspection {
  _id: string;
  hive_id: string;
  beekeeper_id: string;
  date: string;
  health_status: 'good' | 'fair' | 'poor';
  queen_status: 'present' | 'missing' | 'unknown';
  notes?: string;
  frames_of_honey?: number;
  frames_of_brood?: number;
  createdAt: string;
}

export interface CreateInspectionData {
  hive_id: string;
  date: string;
  health_status?: 'good' | 'fair' | 'poor';
  queen_status?: 'present' | 'missing' | 'unknown';
  notes?: string;
  frames_of_honey?: number;
  frames_of_brood?: number;
}

export async function fetchInspections(): Promise<Inspection[]> {
  return apiFetch('/api/inspections');
}

export async function createInspection(data: CreateInspectionData): Promise<Inspection> {
  return apiFetch('/api/inspections', {
    method: 'POST',
    body: data
  });
}
