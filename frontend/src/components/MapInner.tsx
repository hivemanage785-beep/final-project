import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ScorePanel } from './ScorePanel';
import { SavedLocationsDrawer } from './SavedLocationsDrawer';
import { AddHiveSheet } from './AddHiveSheet';
import { useScore } from '../hooks/useScore';
import { useSavedLocations } from '../hooks/useSavedLocations';
import { liveUserIcon, crosshairIcon } from '../hooks/useMapInteractions';
import { apiGet } from '../services/api';

/* Fix default leaflet icon paths */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getSuggestionIcon = (score: number) => {
  const color = score > 60 ? '#15803D' : score >= 30 ? '#B45309' : '#B91C1C';
  return new L.DivIcon({
    html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`,
    className: 'suggestion-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
};

/* ── Internal helpers ── */
const ClickHandler: React.FC<{ onPick: (lat: number, lng: number) => void }> = ({ onPick }) => {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
};

const MapPanner: React.FC<{ target?: { lat: number; lng: number } | null }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], 10, { animate: true });
  }, [target, map]);
  return null;
};

/* ── Main component ── */
export interface MapInnerProps { selectedMonth: number; user: any; }

export const MapInner: React.FC<MapInnerProps> = ({ selectedMonth, user }) => {
  console.log('[MapInner] Initializing. Month:', selectedMonth, 'User:', user?.uid);
  const [isSavedOpen,  setIsSavedOpen]  = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [panTarget,    setPanTarget]    = useState<{ lat: number; lng: number } | null>(null);
  const [mapError,     setMapError]     = useState(false);
  const [suggestions,  setSuggestions]  = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isAddHiveOpen, setIsAddHiveOpen] = useState(false);

  const { locations, deleteLocation } = useSavedLocations(user?.uid);

  const {
    fetchLocationScore,
    scoreResult, loading: scoreLoading,
    panelOpen, closePanel,
    saveCurrentLocation,
    error: scoreError,
    activeMarker,
  } = useScore(user, () => {});

  const fetchSuggestions = async (lat: number, lng: number) => {
    try {
      const data = await apiGet(`/api/suggestions?lat=${lat}&lng=${lng}&month=${selectedMonth}`);
      if (Array.isArray(data)) setSuggestions(data);
    } catch (err) {
      console.error('Suggestions error', err);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      if (!user) return;
      const uid = user.uid;
      console.log('[MapInner] Map clicked at:', lat, lng);
      setSelectedLocation({ lat, lng });
      await fetchLocationScore(lat, lng, selectedMonth, uid);
    } catch (err) {
      console.error('[MapInner] Map click handler failed:', err);
      setMapError(true);
    }
  };

  const handleUseLocation = () => {
    setIsAddHiveOpen(true);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLiveLocation(loc);
      setPanTarget(loc);
      fetchSuggestions(loc.lat, loc.lng);
    }, err => {
      // fallback
      fetchSuggestions(11.1271, 78.6569);
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setPanTarget({ lat, lng: lon });
        fetchSuggestions(lat, lon);
      } else {
        alert('Location not found');
      }
    } catch (err) {
      alert('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    handleLocate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Map failed to even mount */
  if (mapError) {
    return (
      <div style={{
        width:'100%', height:'100%',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#F5F3EF', gap:10
      }}>
        <p style={{ fontSize:15, fontWeight:700, color:'#555' }}>Map unavailable</p>
        <p style={{ fontSize:12, color:'#aaa' }}>Check your network connection</p>
      </div>
    );
  }

  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);

  const handleOptimize = async () => {
    setOptimizeLoading(true);
    try {
      const { apiPost } = await import('../services/api');
      const payload = {
        locations: locations.map(l => ({ lat: l.lat, lng: l.lng, score: l.score })),
        hiveCount: 10,
        useTimeOptimization: false
      };
      const res = await apiPost('/api/allocate-hives', payload);
      alert(`Optimization Result:\n${JSON.stringify(res, null, 2)}`);
    } catch(e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setOptimizeLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulateLoading(true);
    try {
      const { apiPost } = await import('../services/api');
      const payload = {
        locations: locations.map(l => ({ lat: l.lat, lng: l.lng, score: l.score })),
        hiveCount: 10,
        iterations: 50
      };
      const res = await apiPost('/api/simulate', payload);
      alert(`Simulation Result:\n${JSON.stringify(res, null, 2)}`);
    } catch(e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSimulateLoading(false);
    }
  };

  return (
    <div className="map-wrapper">
      {/* Search Bar */}
      <div style={{ position: 'absolute', top: 20, left: 20, right: 20, zIndex: 1000 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, background: 'white', padding: '6px 12px', borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
          <input
            type="text"
            placeholder="Search location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14 }}
          />
          <button type="submit" disabled={searchLoading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}>
            {searchLoading ? '...' : '🔍'}
          </button>
        </form>
      </div>

      {/* Base map + layers */}
      <MapContainer
        center={[11.1271, 78.6569]}
        zoom={7}
        style={{ height: '100%', width: '100%', zIndex: 1, minHeight: '400px' }}
        zoomControl={false}
        whenReady={() => console.log('[MapInner] MapContainer successfully mounted')}
      >
        {/* CARTO light — clean, fast, no API key */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <ClickHandler onPick={handleMapClick} />
        <MapPanner target={panTarget} />

        {liveLocation && (
          <Marker position={[liveLocation.lat, liveLocation.lng]} icon={liveUserIcon} zIndexOffset={1000} />
        )}
        {panelOpen && activeMarker && (
          <Marker position={[activeMarker.lat, activeMarker.lng]} icon={crosshairIcon} />
        )}

        {/* Suggestion Markers */}
        {suggestions.map((sug, i) => (
          <Marker 
            key={i} 
            position={[sug.lat, sug.lng]} 
            icon={getSuggestionIcon(sug.score)}
            eventHandlers={{ click: () => handleMapClick(sug.lat, sug.lng) }}
          >
            <Popup>
              <div>Score: {sug.score}</div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#555' }}>
                Reason: Based on favorable environmental conditions (temperature, rainfall, humidity).
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* FAB controls */}
      <div className="map-fabs">
        <button className="fab fab-white" title="Saved locations" onClick={() => setIsSavedOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
        </button>
        <button className="fab fab-primary" title="My location" onClick={handleLocate}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">Suitability</div>
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#B71C1C' }} />
          <span className="legend-label">Poor</span>
        </div>
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#F57C00' }} />
          <span className="legend-label">Moderate</span>
        </div>
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#1B5E20' }} />
          <span className="legend-label">Good</span>
        </div>
        <div className="legend-bar" />
      </div>

      {/* Score bottom sheet */}
      <ScorePanel
        isOpen={panelOpen}
        result={scoreResult}
        coords={activeMarker}
        month={selectedMonth}
        loading={scoreLoading}
        error={scoreError}
        onClose={closePanel}
        onSave={() => saveCurrentLocation(selectedMonth)}
        onRetry={() => {
          if (activeMarker) fetchLocationScore(activeMarker.lat, activeMarker.lng, selectedMonth, user?.uid);
        }}
        onUseLocation={handleUseLocation}
      />

      {isAddHiveOpen && selectedLocation && (
        <AddHiveSheet 
          isOpen={isAddHiveOpen} 
          onClose={() => setIsAddHiveOpen(false)} 
          onAdded={() => { setIsAddHiveOpen(false); }}
          initialLat={selectedLocation.lat}
          initialLng={selectedLocation.lng}
        />
      )}

      {/* Saved locations drawer */}
      <SavedLocationsDrawer
        isOpen={isSavedOpen}
        onClose={() => setIsSavedOpen(false)}
        locations={locations}
        onDelete={deleteLocation}
        onSelect={loc => { setPanTarget({ lat: loc.lat, lng: loc.lng }); setIsSavedOpen(false); }}
        onOptimize={handleOptimize}
        onSimulate={handleSimulate}
        optimizeLoading={optimizeLoading}
        simulateLoading={simulateLoading}
      />
    </div>
  );
};
