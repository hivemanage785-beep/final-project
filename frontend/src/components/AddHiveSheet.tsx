import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { apiPost } from '../services/api';
import { createPortal } from 'react-dom';
import { auth } from '../firebase';
import { useSavedLocations } from '../hooks/useSavedLocations';

export const AddHiveSheet = ({ isOpen, onClose, onAdded, initialLat, initialLng }: { isOpen: boolean, onClose: () => void, onAdded: () => void, initialLat?: number, initialLng?: number }) => {
  const { locations } = useSavedLocations(auth.currentUser?.uid);
  const [name, setName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [lat, setLat] = useState(initialLat ? initialLat.toString() : '');
  const [lng, setLng] = useState(initialLng ? initialLng.toString() : '');
  const [boxes, setBoxes] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-fill lat/lng when passed from props
  useEffect(() => {
    if (initialLat) setLat(initialLat.toString());
    if (initialLng) setLng(initialLng.toString());
  }, [initialLat, initialLng]);

  // Auto-fill lat/lng when a saved location is selected
  useEffect(() => {
    if (selectedLocationId) {
      const loc = locations.find(l => l.id === selectedLocationId);
      if (loc) {
        setLat(loc.lat.toString());
        setLng(loc.lng.toString());
      }
    }
  }, [selectedLocationId, locations]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        _id: crypto.randomUUID(),
        uid: 'user-auth-uid',
        hive_id: name,
        name: name,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        box_count: parseInt(boxes) || 1,
      };
      
      await apiPost('/api/hives', payload);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);

      setName('');
      setLat('');
      setLng('');
      setBoxes('1');
      
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add hive');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} 
        onClick={onClose} 
      />
      
      <div style={{ position: 'relative', width: '100%', backgroundColor: 'white', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Add New Hive</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          {error && <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>{error}</div>}
          
          <div>
            <label htmlFor="hiveName" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Hive Name / ID</label>
            <input id="hiveName" name="hiveName" type="text" required value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '12px', padding: '12px 16px', fontSize: '16px' }} placeholder="e.g. HIVE-SALEM-3" />
          </div>

          <div>
            <label htmlFor="savedLocation" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Choose a Location</label>
            <select 
              id="savedLocation" 
              value={selectedLocationId} 
              onChange={e => setSelectedLocationId(e.target.value)} 
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '12px', padding: '12px 16px', fontSize: '16px', backgroundColor: '#fff' }}
            >
              <option value="">-- Custom Location --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name} ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="hiveLat" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Latitude</label>
              <input id="hiveLat" name="hiveLat" type="number" step="any" required readOnly value={lat} onChange={e => setLat(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '12px', padding: '12px 16px', fontSize: '16px', backgroundColor: '#f3f4f6' }} placeholder="11.6643" />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="hiveLng" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Longitude</label>
              <input id="hiveLng" name="hiveLng" type="number" step="any" required readOnly value={lng} onChange={e => setLng(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '12px', padding: '12px 16px', fontSize: '16px', backgroundColor: '#f3f4f6' }} placeholder="78.1460" />
            </div>
          </div>

          <div>
            <label htmlFor="hiveBoxes" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Box Count</label>
            <input id="hiveBoxes" name="hiveBoxes" type="number" min="1" required value={boxes} onChange={e => setBoxes(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '12px', padding: '12px 16px', fontSize: '16px' }} />
          </div>

          <button type="submit" disabled={loading} style={{ backgroundColor: '#8B0000', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 'bold', marginTop: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving...' : 'Create Hive'}
          </button>
          {success && <div>Saved successfully</div>}
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
