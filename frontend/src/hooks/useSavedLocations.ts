import { useState, useEffect } from 'react';
import { SavedLocation, db } from '../lib/db';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { useSync } from './useSync';

export function useSavedLocations(uid: string | undefined) {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { queueOperation } = useSync();

  useEffect(() => {
    if (!uid) {
      setLocations([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        // Load from IndexedDB first
        const localData = await db.savedLocations.where('uid').equals(uid).reverse().sortBy('timestamp');
        if (localData && localData.length > 0) {
          setLocations(localData);
        }

        // Fetch from backend
        try {
          const res = await apiGet('/api/saved-locations');
          if (res && res.data) {
            // Update IndexedDB with fresh data
            await db.savedLocations.where('uid').equals(uid).delete();
            const remoteData = res.data.map((item: any) => {
              // The backend API does not return a `name` field.
              // Synthesize a deterministic display label so the dropdown
              // is always human-readable regardless of sync state.
              const syntheticName = item.name
                || `Zone M${item.month} · Score ${Math.round(item.score || 0)}%`
                || `${(item.lat || 0).toFixed(4)}, ${(item.lng || 0).toFixed(4)}`;
              return {
                ...item,
                name: syntheticName,
                uid,
                timestamp: new Date(item.created_at).getTime()
              };
            });
            await db.savedLocations.bulkAdd(remoteData);
            
            // Reload from IndexedDB to maintain sorting
            const refreshed = await db.savedLocations.where('uid').equals(uid).reverse().sortBy('timestamp');
            setLocations(refreshed);
          }
        } catch (e) {
          console.warn('Backend sync failed, using offline saved locations', e);
        }
      } catch (err: any) {
        console.error('SavedLocations load error:', err.message);
        setError('Failed to load saved locations.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [uid]);

  const saveLocation = async (location: Omit<SavedLocation, 'id' | 'timestamp' | 'uid'>) => {
    if (!uid) return;
    const newLoc: SavedLocation = {
      ...location as any,
      uid,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString()
    };
    
    // Update local state instantly
    const updated = [newLoc, ...locations].slice(0, 20);
    setLocations(updated);
    
    // Save to IndexedDB
    await db.savedLocations.add(newLoc);
    
    // Save to Backend (via sync outbox or direct)
    try {
      await apiPost('/api/saved-locations', { ...newLoc, created_at: new Date(newLoc.timestamp).toISOString() });
    } catch (err) {
      queueOperation('savedLocations', 'create', newLoc);
    }
  };

  const deleteLocation = async (id: string) => {
    if (!uid) return;
    
    // Update local state instantly
    const updated = locations.filter(loc => loc.id !== id);
    setLocations(updated);
    
    // Remove from IndexedDB
    await db.savedLocations.delete(id);
    
    // Remove from Backend
    try {
      await apiDelete(`/api/saved-locations/${id}`);
    } catch (err) {
      queueOperation('savedLocations', 'delete', { id });
    }
  };

  return { locations, saveLocation, deleteLocation, loading, error };
}

