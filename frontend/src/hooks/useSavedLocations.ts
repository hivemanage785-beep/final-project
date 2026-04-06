import { useState, useEffect } from 'react';
import { SavedLocation } from '../types/score';

export function useSavedLocations(uid: string | undefined) {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setLocations([]);
      setLoading(false);
      return;
    }

    try {
      const storageKey = `saved_locations_${uid}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        setLocations(JSON.parse(data));
      } else {
        setLocations([]);
      }
    } catch (err: any) {
      console.error('LocalStorage error:', err.message);
      setError('Failed to load saved locations.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const saveLocation = async (location: Omit<SavedLocation, 'id' | 'timestamp'>) => {
    if (!uid) return;
    const newLoc: SavedLocation = {
      ...location,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
      timestamp: Date.now()
    };
    
    // Calculate new state
    const updated = [newLoc, ...locations].slice(0, 20); // Keep max 20
    setLocations(updated);
    
    // Commit to storage
    localStorage.setItem(`saved_locations_${uid}`, JSON.stringify(updated));
  };

  const deleteLocation = async (id: string) => {
    if (!uid) return;
    const updated = locations.filter(loc => loc.id !== id);
    setLocations(updated);
    localStorage.setItem(`saved_locations_${uid}`, JSON.stringify(updated));
  };

  return { locations, saveLocation, deleteLocation, loading, error };
}

