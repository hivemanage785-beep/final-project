import { useState, useCallback } from 'react';
import { ScoreResult, SavedLocation, PartnerFarmer } from '../types/score';
import { fetchScore, postFeedback, fetchNearbyFarmers } from '../api/scoreApi';
import { useSavedLocations } from './useSavedLocations';
import { User } from 'firebase/auth';

interface UseScoreReturn {
  scoreResult: ScoreResult | null;
  nearbyFarmers: PartnerFarmer[];
  loading: boolean;
  error: string | null;
  panelOpen: boolean;
  activeMarker: { lat: number; lng: number } | null;
  fetchLocationScore: (lat: number, lng: number, month: number, uid: string) => Promise<void>;
  closePanel: () => void;
  saveCurrentLocation: (month: number) => void;
  locations: SavedLocation[];
  deleteLocation: (id: string) => void;
  savedError: string | null;
  setScoreResult: (res: ScoreResult | null) => void;
}

// Session-level singleton cache for coordinates
const scoreCache = new Map<string, ScoreResult>();

let currentController: AbortController | null = null;

export function useScore(user: User, setIsSavedDrawerOpen: (o: boolean) => void): UseScoreReturn {
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [nearbyFarmers, setNearbyFarmers] = useState<PartnerFarmer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeMarker, setActiveMarker] = useState<{ lat: number; lng: number } | null>(null);

  const uid = user?.uid;
  const { locations, saveLocation, deleteLocation, error: savedError } = useSavedLocations(uid);

  const fetchLocationScore = useCallback(async (lat: number, lng: number, month: number, uid: string) => {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${month}`;
    
    setActiveMarker({ lat, lng });
    setPanelOpen(true);
    
    // 1. Check Cache
    if (scoreCache.has(cacheKey)) {
      setScoreResult(scoreCache.get(cacheKey)!);
      setError(null);
      setLoading(false);
      return;
    }

    // 2. Online Guard
    if (!navigator.onLine) {
      setError("Analysis unavailable offline.");
      setScoreResult(null);
      setLoading(false);
      return;
    }

    // 3. Abort Stale
    if (currentController) currentController.abort();
    currentController = new AbortController();

    setLoading(true);
    setError(null);
    setScoreResult(null);
    setNearbyFarmers([]);

    try {
      // 4. Fetch
      const [data, farmers] = await Promise.all([
        fetchScore(lat, lng, month).catch(err => { throw err; }),
        fetchNearbyFarmers(lat, lng).catch(() => [] as PartnerFarmer[])
      ]);

      if (data) {
        setScoreResult(data);
        setNearbyFarmers(farmers);
        scoreCache.set(cacheKey, data); // Hydrate cache

        // 5. Background Feedback (non-blocking)
        postFeedback({
          lat, lng, month,
          weatherScore: data.weatherScore,
          floraScore: data.floraScore,
          seasonScore: data.seasonScore,
          finalScore: data.score,
          floraCount: data.floraCount,
          avgTemp: data.rawWeather.avgTemp,
          avgRain: data.rawWeather.avgRain,
          avgWind: data.rawWeather.avgWind,
          uid
        }).catch(() => {});
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message?.includes('outside') ? err.message : 'Unable to analyze this location.');
    } finally {
      if (!currentController?.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const saveCurrentLocation = useCallback((month: number) => {
    if (scoreResult && activeMarker) {
      saveLocation({
        lat: activeMarker.lat,
        lng: activeMarker.lng,
        score: scoreResult.score,
        grade: scoreResult.grade,
        month,
        suitability_label: scoreResult.suitability_label || 'Analyzed Zone'
      });
      setIsSavedDrawerOpen(true);
      setPanelOpen(false);
    }
  }, [scoreResult, activeMarker, saveLocation, setIsSavedDrawerOpen]);

  return {
    scoreResult,
    nearbyFarmers,
    loading,
    error,
    panelOpen,
    activeMarker,
    fetchLocationScore,
    closePanel: () => setPanelOpen(false),
    saveCurrentLocation,
    locations,
    deleteLocation,
    savedError,
    setScoreResult
  };
}

