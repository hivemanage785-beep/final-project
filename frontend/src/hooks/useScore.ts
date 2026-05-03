import { useState } from 'react';
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
}

let currentController: AbortController | null = null;

export function useScore(user: User, setIsSavedDrawerOpen: (o: boolean) => void): UseScoreReturn {
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [nearbyFarmers, setNearbyFarmers] = useState<PartnerFarmer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeMarker, setActiveMarker] = useState<{ lat: number; lng: number } | null>(null);

  const { locations, saveLocation, deleteLocation, error: savedError } = useSavedLocations(user.uid);

  const fetchLocationScore = async (lat: number, lng: number, month: number, uid: string) => {
    setActiveMarker({ lat, lng });
    setPanelOpen(true);
    
    if (!navigator.onLine) {
      setError("Prediction unavailable offline. Please reconnect to analyze location.");
      setScoreResult(null);
      setLoading(false);
      return;
    }

    if (currentController) {
      currentController.abort();
    }
    currentController = new AbortController();

    setLoading(true);
    setError(null);
    setScoreResult(null);
    setNearbyFarmers([]);

    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/score`;
      const [dataResponse, farmers] = await Promise.all([
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, month }),
          signal: currentController.signal
        }),
        fetchNearbyFarmers(lat, lng).catch(() => [] as PartnerFarmer[])
      ]);

      if (!dataResponse.ok) {
        throw new Error('HTTP error ' + dataResponse.status);
      }
      const dataJson = await dataResponse.json();
      const data = dataJson.data !== undefined ? dataJson.data : dataJson;

      setScoreResult(data);
      setNearbyFarmers(farmers);

      // Fire-and-forget feedback
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
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // DO NOTHING (silent cancel)
      } else {
        setError('Unable to fetch prediction. Please try again.');
      }
    } finally {
      // Only clear loading if we didn't just abort to start a new one
      if (currentController && !currentController.signal.aborted) {
        setLoading(false);
      } else if (!currentController) {
        setLoading(false);
      }
    }
  };

  const saveCurrentLocation = (month: number) => {
    if (scoreResult && activeMarker) {
      saveLocation({
        lat: activeMarker.lat,
        lng: activeMarker.lng,
        score: scoreResult.score,
        grade: scoreResult.grade,
        month,
      });
      setIsSavedDrawerOpen(true);
      setPanelOpen(false);
    }
  };

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
  };
}
