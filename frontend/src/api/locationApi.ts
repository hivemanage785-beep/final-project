import { apiFetch } from '../lib/api';
import { SavedLocation } from '../types/score';

export interface CreateSavedLocationData {
  id: string; // The frontend-generated ID or a unique string
  lat: number;
  lng: number;
  score: number;
  month: number;
  label?: string;
  grade?: string;
}

export async function fetchSavedLocations(): Promise<SavedLocation[]> {
  return apiFetch('/api/saved-locations');
}

export async function createSavedLocation(data: CreateSavedLocationData): Promise<SavedLocation> {
  return apiFetch('/api/saved-locations', {
    method: 'POST',
    body: data
  });
}

export async function deleteSavedLocation(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/saved-locations/${id}`, {
    method: 'DELETE'
  });
}
