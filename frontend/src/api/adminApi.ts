import { apiFetch } from '../lib/api';

export interface PendingRequest {
  _id: string;
  beekeeper_id: string;
  farmer_id: string;
  status: string;
  createdAt: string;
}

export interface Farmer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  location?: { lat: number; lng: number };
  status: 'approved' | 'pending' | 'rejected';
}

export interface Beekeeper {
  _id: string;
  name: string;
  email: string;
  is_verified: boolean;
}

export async function fetchPendingRequests(): Promise<PendingRequest[]> {
  return apiFetch('/api/admin/requests');
}

export async function approveRequest(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/admin/requests/${id}/approve`, {
    method: 'POST'
  });
}

export async function fetchAllFarmers(): Promise<Farmer[]> {
  return apiFetch('/api/admin/farmers');
}

export async function updateFarmerStatus(id: string, status: 'approved' | 'pending' | 'rejected'): Promise<Farmer> {
  return apiFetch(`/api/admin/farmers/${id}/status`, {
    method: 'PATCH',
    body: { status }
  });
}

export async function deleteFarmer(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/admin/farmers/${id}`, {
    method: 'DELETE'
  });
}

export async function fetchAllBeekeepers(): Promise<Beekeeper[]> {
  return apiFetch('/api/admin/beekeepers');
}

export async function verifyBeekeeper(id: string): Promise<Beekeeper> {
  return apiFetch(`/api/admin/beekeepers/${id}/verify`, {
    method: 'PATCH'
  });
}
