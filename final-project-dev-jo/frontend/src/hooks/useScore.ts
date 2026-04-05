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
    setLoading(true);
    setError(null);
    setScoreResult(null);
    setNearbyFarmers([]);

    try {
      const [data, farmers] = await Promise.all([
        fetchScore(lat, lng, month),
        fetchNearbyFarmers(lat, lng).catch(() => [] as PartnerFarmer[])
      ]);

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
      setError(err.message || 'Failed to analyze location.');
    } finally {
      setLoading(false);
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
