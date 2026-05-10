import { apiFetch } from '../lib/api';

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  desc: string;
  source: string;
  unread: boolean;
}

export async function fetchAlerts(): Promise<Alert[]> {
  return apiFetch('/api/alerts');
}
