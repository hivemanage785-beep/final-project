import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { User } from 'firebase/auth';
import { HeatmapLayer } from './HeatmapLayer';
import { ScorePanel } from './ScorePanel';
import { useScore } from '../hooks/useScore';
import { useSavedLocations } from '../hooks/useSavedLocations';
import { useMapInteractions, hexIcon, liveUserIcon } from '../hooks/useMapInteractions';
import { SavedLocationsDrawer } from './SavedLocationsDrawer';

// Fix default leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapClickHandler: React.FC<{ onClick: (lat: number, lng: number) => void }> = ({ onClick }) => {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
};

const MapController: React.FC<{ target?: {lat: number, lng: number} }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], 10, { animate: true });
  }, [target, map]);
  return null;
};

export interface MapInnerProps {
  selectedMonth: number;
  user: User;
}

export const MapInner: React.FC<MapInnerProps> = ({ selectedMonth, user }) => {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{lat: number, lng: number} | null>(null);
  const [pannerTarget, setPannerTarget] = useState<{lat: number, lng: number} | null>(null);

  const { locations, deleteLocation } = useSavedLocations(user.uid);
  const {
    fetchLocationScore,
    scoreResult,
    loading: scoreLoading,
    panelOpen,
    closePanel,
    saveCurrentLocation,
    error: scoreError,
    activeMarker
  } = useScore(user, () => {});

  const { markers, handleMapClick } = useMapInteractions(async (lat, lng) => {
    await fetchLocationScore(lat, lng, selectedMonth, user.uid);
  });

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setLiveLocation({ lat: latitude, lng: longitude });
      setPannerTarget({ lat: latitude, lng: longitude });
    });
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[11.1271, 78.6569]}
        zoom={7}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <HeatmapLayer selectedMonth={selectedMonth} showHeatmap={showHeatmap} />
        <MapClickHandler onClick={handleMapClick} />
        <MapController target={pannerTarget || undefined} />
        
        {liveLocation && (
          <Marker position={[liveLocation.lat, liveLocation.lng]} icon={liveUserIcon} zIndexOffset={1000} />
        )}
        {markers.map(m => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={hexIcon} />
        ))}
      </MapContainer>

      {/* NEW PREMIUM FABs */}
      <div className="map-fabs">
        <button className="fab fab-lyr" onClick={() => setIsSavedOpen(true)}>
           <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </button>
        <button className={`fab ${showHeatmap ? 'fab-ht' : 'fab-lyr'}`} onClick={() => setShowHeatmap(!showHeatmap)}>
           <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={showHeatmap ? "white" : "currentColor"} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </button>
        <button className="fab fab-lc" onClick={handleLocate}>
           <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        </button>
      </div>

      <div className="map-lgd">
        <div className="lgd-title">Suitability Index</div>
        <div className="lgd-row"><div className="lgd-dot" style={{background:'#DC2626'}}></div><span className="lgd-lbl">Low</span></div>
        <div className="lgd-row"><div className="lgd-dot" style={{background:'#F59E0B'}}></div><span className="lgd-lbl">Medium</span></div>
        <div className="lgd-row"><div className="lgd-dot" style={{background:'#16A34A'}}></div><span className="lgd-lbl">High</span></div>
        <div className="lgd-bar" />
      </div>

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

      <SavedLocationsDrawer
        isOpen={isSavedOpen}
        onClose={() => setIsSavedOpen(false)}
        locations={locations}
        onDelete={deleteLocation}
        onSelect={(loc) => { setPannerTarget({ lat: loc.lat, lng: loc.lng }); setIsSavedOpen(false); }}
      />
    </div>
  );
};
