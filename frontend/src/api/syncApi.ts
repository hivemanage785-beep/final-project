import { apiFetch } from '../lib/api';

export interface SyncResponse {
  success: boolean;
  synced_count: number;
  failed_count: number;
  errors?: any[];
}

export async function syncQueue(queue: any[]): Promise<SyncResponse> {
  return apiFetch('/api/sync', {
    method: 'POST',
    body: { queue }
  });
}
