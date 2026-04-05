import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
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

    const q = query(
      collection(db, 'users', uid, 'savedLocations'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const locs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as SavedLocation[];
        setLocations(locs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore snapshot error:', err.message);
        setError('Failed to load saved locations.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const saveLocation = async (location: Omit<SavedLocation, 'id' | 'timestamp'>) => {
    if (!uid) return;
    await addDoc(collection(db, 'users', uid, 'savedLocations'), {
      ...location,
      timestamp: Date.now()
    });
  };

  const deleteLocation = async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'savedLocations', id));
  };

  return { locations, saveLocation, deleteLocation, loading, error };
}

