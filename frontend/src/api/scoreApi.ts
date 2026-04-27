import { ScoreResult, PartnerFarmer, RequestStatus, FeedbackPayload } from '../types/score';
import { apiFetch } from '../lib/api';




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
