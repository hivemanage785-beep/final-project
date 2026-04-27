import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ScorePanel } from './ScorePanel';
import { SavedLocationsDrawer } from './SavedLocationsDrawer';
import { useScore } from '../hooks/useScore';
import { useSavedLocations } from '../hooks/useSavedLocations';
import { useMapInteractions, hexIcon, liveUserIcon } from '../hooks/useMapInteractions';
import HeatmapLayer from './DeckHeatmapLayer';

/* Fix default leaflet icon paths */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  const [showHeatmap,  setShowHeatmap]  = useState(true);
  const [isSavedOpen,  setIsSavedOpen]  = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [panTarget,    setPanTarget]    = useState<{ lat: number; lng: number } | null>(null);
  const [mapError,     setMapError]     = useState(false);

  const { locations, deleteLocation } = useSavedLocations(user?.uid);

  const {
    fetchLocationScore,
    scoreResult, loading: scoreLoading,
    panelOpen, closePanel,
    saveCurrentLocation,
    error: scoreError,
    activeMarker,
  } = useScore(user, () => {});

  const { markers, handleMapClick } = useMapInteractions(async (lat, lng) => {
    await fetchLocationScore(lat, lng, selectedMonth, user?.uid);
  });

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLiveLocation(loc);
      setPanTarget(loc);
    });
  };

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
      {/* Base map + layers */}
      <MapContainer
        center={[11.1271, 78.6569]}
        zoom={7}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        {/* CARTO light — clean, fast, no API key */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Heatmap — gracefully degrades on error */}
        {showHeatmap && (
          <HeatmapLayer selectedMonth={selectedMonth} onError={() => {/* silent */}} />
        )}

        <ClickHandler onPick={handleMapClick} />
        <MapPanner target={panTarget} />

        {liveLocation && (
          <Marker position={[liveLocation.lat, liveLocation.lng]} icon={liveUserIcon} zIndexOffset={1000} />
        )}
        {markers.map(m => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={hexIcon} />
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
        <button
          className={`fab ${showHeatmap ? 'fab-primary' : 'fab-white'}`}
          title="Toggle heatmap"
          onClick={() => setShowHeatmap(v => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showHeatmap ? 'white' : 'currentColor'} strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
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
          <div className="legend-dot" style={{ background: '#DC2626' }} />
          <span className="legend-label">Low</span>
        </div>
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#F59E0B' }} />
          <span className="legend-label">Medium</span>
        </div>
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#16A34A' }} />
          <span className="legend-label">High</span>
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
      />

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
