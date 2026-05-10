import { apiFetch } from '../lib/api';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'beekeeper' | 'admin';
  is_verified: boolean;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user: User;
}

export async function register(data: any): Promise<AuthResponse> {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: data
  });
}

export async function login(data: any): Promise<AuthResponse> {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: data
  });
}

export async function fetchMe(): Promise<{ success: boolean; user: User }> {
  return apiFetch('/api/auth/me');
}
