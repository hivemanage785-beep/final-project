export interface ScoreResult {
  score: number;
  grade: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  weatherScore: number;
  floraScore: number;
  seasonScore: number;
  recommendedHives: number;
  yieldOutlook: 'Poor' | 'Moderate' | 'Good' | 'High';
  primaryConcern: string;
  movementAdvice: string;
  reasoning: string[];
  mlWeightsUsed: { weather: number; flora: number; season: number };
  rawWeather: { avgTemp: number; avgRain: number; avgWind: number };
  floraCount: number;
  // Monthly 12-score array (index 0 = currentMonth, wraps around)
  monthlyScores?: number[];
  // Confidence calibration fields
  mlConfidence?: number;
  mlWarning?: 'LOW_CONFIDENCE_PREDICTION' | null;
  mlModel?: string;
  ndvi_available?: boolean;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  score: number;
  intensity: number;
}

export interface PartnerFarmer {
  farmer_id: string;
  name: string;
  approx_location: { lat: number; lng: number };
}

export interface RequestStatus {
  request_id: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface SavedLocation {
  id: string;
  lat: number;
  lng: number;
  score: number;
  grade: string;
  month: number;
  timestamp: number;
}

export interface FeedbackPayload {
  lat: number;
  lng: number;
  month: number;
  weatherScore: number;
  floraScore: number;
  seasonScore: number;
  finalScore: number;
  floraCount: number;
  avgTemp: number;
  avgRain: number;
  avgWind: number;
  uid?: string;
}

