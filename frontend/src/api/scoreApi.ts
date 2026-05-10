import { ScoreResult, PartnerFarmer, RequestStatus, FeedbackPayload } from '../types/score';
import { apiFetch } from '../lib/api';

export interface NDVIReturn {
  ndvi: number | null;
  source: string;
  timestamp: string;
  resolution_m: number;
}

export interface ScoreTracePoint {
  month: number;
  score: number;
  label: string;
}

export interface SuggestedLocation {
  lat: number;
  lng: number;
  score: number;
  label: string;
}

export async function fetchScore(lat: number, lng: number, month: number): Promise<ScoreResult> {
  return apiFetch('/api/score', {
    method: 'POST',
    body: { lat, lng, month },
    timeoutMs: 15000
  });
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

export async function fetchNDVI(lat: number, lng: number, date?: string): Promise<NDVIReturn> {
  return apiFetch(`/api/ndvi?lat=${lat}&lng=${lng}${date ? `&date=${date}` : ''}`);
}

export async function fetchScoreTrace(lat: number, lng: number, month: number): Promise<ScoreTracePoint[]> {
  return apiFetch(`/api/trace-score?lat=${lat}&lng=${lng}&month=${month}`);
}

export async function fetchSuggestions(lat: number, lng: number, month?: number): Promise<SuggestedLocation[]> {
  const monthParam = month !== undefined ? `&month=${month}` : '';
  return apiFetch(`/api/suggestions?lat=${lat}&lng=${lng}${monthParam}`);
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

