import { ScoreResult, HeatmapPoint, FeedbackPayload } from '../types/score';
import { apiFetch } from '../lib/api';

export async function fetchScore(lat: number, lng: number, month: number): Promise<ScoreResult> {
  // apiFetch throws on non-OK, returns data.data
  return apiFetch('/api/score', {
    method: 'POST',
    body: { lat, lng, month },
    timeoutMs: 12000  // tile lookup can be slow on cold DB
  });
}

export async function fetchHeatmapGrid(
  month: number,
  bounds: { lat_min: number; lat_max: number; lng_min: number; lng_max: number }
): Promise<[number, number, number][]> {
  const query = `?month=${month}&lat_min=${bounds.lat_min}&lat_max=${bounds.lat_max}&lng_min=${bounds.lng_min}&lng_max=${bounds.lng_max}`;
  const data = await apiFetch(`/api/heatmap-grid${query}`, { timeoutMs: 15000 });
  return data || [];
}

export async function postFeedback(data: FeedbackPayload): Promise<void> {
  // Fire-and-forget with non-throwing wrapper — feedback loss is acceptable
  apiFetch('/api/feedback', {
    method: 'POST',
    body: data,
    timeoutMs: 5000
  }).catch(() => {
    // Silently swallowed — feedback is best-effort, never blocks UI
  });
}

// ─── Farmer Discovery ────────────────────────────────────────────────────────

export async function fetchNearbyFarmers(lat: number, lng: number): Promise<PartnerFarmer[]> {
  const data = await apiFetch(`/api/farmers/nearby?lat=${lat}&lng=${lng}`);
  return data || [];
}

export async function requestContact(farmerId: string): Promise<RequestStatus> {
  return apiFetch('/api/contact-request', {
    method: 'POST',
    body: { farmer_id: farmerId }
  });
}
