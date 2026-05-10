import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { apiPost } from '../../services/api';
import { createPortal } from 'react-dom';
import { auth } from '../../firebase';
import { useSavedLocations } from '../../hooks/useSavedLocations';

export const AddHiveSheet = ({ isOpen, onClose, onAdded, initialLat, initialLng }: { isOpen: boolean, onClose: () => void, onAdded: () => void, initialLat?: number, initialLng?: number }) => {
  const { locations } = useSavedLocations(auth.currentUser?.uid);
  const [name, setName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [lat, setLat] = useState(initialLat ? initialLat.toString() : '');
  const [lng, setLng] = useState(initialLng ? initialLng.toString() : '');
  const [boxes, setBoxes] = useState('1');
  const [queenStatus, setQueenStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-fill lat/lng when passed from props, and try to match a saved location
  useEffect(() => {
    if (initialLat && initialLng) {
      setLat(initialLat.toString());
      setLng(initialLng.toString());
      
      const matched = locations.find(l => Math.abs(l.lat - initialLat) < 0.0001 && Math.abs(l.lng - initialLng) < 0.0001);
      if (matched) setSelectedLocationId(matched.id || '');
    }
  }, [initialLat, initialLng, locations]);

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

    if (!auth.currentUser?.uid) {
      setError('User not authenticated. Please log in to add a hive.');
      setLoading(false);
      return;
    }

    if (!selectedLocationId) {
      setError('Please select a valid placement zone from your Saved Locations.');
      setLoading(false);
      return;
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setError('Invalid coordinates derived from location. Please select another.');
      setLoading(false);
      return;
    }

    try {
      const selectedLoc = locations.find(l => l.id === selectedLocationId);
      
      const payload = {
        _id: crypto.randomUUID(),
        uid: auth.currentUser.uid,
        hive_id: name,
        name: name,
        lat: parsedLat,
        lng: parsedLng,
        box_count: parseInt(boxes) || 1,
        queen_status: queenStatus,
        notes: notes,
        placement_location_id: selectedLocationId,
        placement_location_name: selectedLoc?.name || ''
      };
      
      await apiPost('/api/hives', payload);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);

      setName('');
      setSelectedLocationId('');
      setLat('');
      setLng('');
      setBoxes('1');
      setQueenStatus('active');
      setNotes('');
      
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
            <label htmlFor="hiveName" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Hive Name / ID <span style={{ color: '#ef4444' }}>*</span></label>
            <input id="hiveName" name="hiveName" type="text" required value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '12px', padding: '12px 16px', fontSize: '16px' }} placeholder="e.g. HIVE-SALEM-3" />
          </div>

          <div>
            <label htmlFor="savedLocation" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Placement Zone <span style={{ color: '#ef4444' }}>*</span></label>
            <select 
              id="savedLocation" 
              required
              value={selectedLocationId} 
              onChange={e => setSelectedLocationId(e.target.value)} 
              className="form-select-native"
            >
              <option value="" disabled>-- Select a Saved Location --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="hiveBoxes" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Box Count</label>
              <input id="hiveBoxes" name="hiveBoxes" type="number" min="1" value={boxes} onChange={e => setBoxes(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '12px', padding: '12px 16px', fontSize: '16px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="queenStatus" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Queen Status</label>
              <select 
                id="queenStatus" 
                value={queenStatus} 
                onChange={e => setQueenStatus(e.target.value)} 
                className="form-select-native"
              >
                <option value="active">Active</option>
                <option value="missing">Missing</option>
                <option value="requeened">Recently Requeened</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="hiveNotes" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Initial Notes</label>
            <textarea id="hiveNotes" name="hiveNotes" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '12px', padding: '12px 16px', fontSize: '16px', minHeight: '80px', resize: 'none' }} placeholder="Optional observations..." />
          </div>

          <button 
            type="submit" 
            disabled={loading || !name.trim() || !selectedLocationId} 
            style={{ 
              backgroundColor: (!name.trim() || !selectedLocationId) ? '#d1d5db' : '#8B0000', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              padding: '16px', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              marginTop: '8px', 
              cursor: (loading || !name.trim() || !selectedLocationId) ? 'not-allowed' : 'pointer' 
            }}
          >
            {loading ? 'Saving...' : 'Create Hive'}
          </button>
          {success && <div style={{ color: '#16a34a', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>Hive created successfully!</div>}
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
