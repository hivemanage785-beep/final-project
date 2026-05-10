import { apiFetch } from '../lib/api';

export interface Hive {
  _id: string;
  hive_id: string;
  location: string;
  health_status: 'good' | 'fair' | 'poor';
  queen_status: 'present' | 'missing' | 'unknown';
  notes?: string;
  beekeeper_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHiveData {
  hive_id: string;
  location: string;
  health_status?: 'good' | 'fair' | 'poor';
  queen_status?: 'present' | 'missing' | 'unknown';
  notes?: string;
}

export interface UpdateHiveData {
  health_status?: 'good' | 'fair' | 'poor';
  queen_status?: 'present' | 'missing' | 'unknown';
  notes?: string;
}

export async function fetchHives(): Promise<Hive[]> {
  return apiFetch('/api/hives');
}

export async function createHive(data: CreateHiveData): Promise<Hive> {
  return apiFetch('/api/hives', {
    method: 'POST',
    body: data
  });
}

export async function updateHive(id: string, data: UpdateHiveData): Promise<Hive> {
  return apiFetch(`/api/hives/${id}`, {
    method: 'PUT',
    body: data
  });
}

export async function deleteHive(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/hives/${id}`, {
    method: 'DELETE'
  });
}
