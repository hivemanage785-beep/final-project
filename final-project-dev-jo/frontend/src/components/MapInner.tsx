import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { User } from 'firebase/auth';
import { HeatmapLayer } from './HeatmapLayer';
import { ScorePanel } from './ScorePanel';
import { DiscoveryPopup } from './DiscoveryPopup';
import { SavedLocationsDrawer } from './SavedLocationsDrawer';
import { Legend } from './Legend';
import { useScore } from '../hooks/useScore';
import { useMapInteractions, hexIcon, liveUserIcon, bestSpotIcon } from '../hooks/useMapInteractions';
import { SavedLocation } from '../types/score';
import { LocateFixed, Loader2, Layers, Map as MapIcon, CircleDot, Sparkles } from 'lucide-react';

// GPS Button Component
const LocateButton: React.FC<{ onClick: () => void; loading: boolean }> = ({ onClick, loading }) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className="absolute bottom-6 right-6 z-[1000] w-12 h-12 bg-white rounded-full shadow-xl border border-gray-100 flex items-center justify-center text-primary-600 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
    title="Use my location"
  >
    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
  </button>
);


export interface MapProps {
  selectedMonth: number;
  user: User;
  isSavedDrawerOpen: boolean;
  setIsSavedDrawerOpen: (o: boolean) => void;
}

// Fix default leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Thin leaflet event bridge component
const MapClickHandler: React.FC<{ onClick: (lat: number, lng: number) => void }> = ({ onClick }) => {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
};

// Camera panner when navigating to a saved location
const MapPanner: React.FC<{ center?: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 9, { animate: true });
  }, [center, map]);
  return null;
};

export const MapInner: React.FC<MapProps> = ({ selectedMonth, user, isSavedDrawerOpen, setIsSavedDrawerOpen }) => {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showBest, setShowBest] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{lat: number, lng: number} | null>(null);
  const [bestSpot, setBestSpot] = useState<{lat: number, lng: number, score: number} | null>(null);
  const score = useScore(user, setIsSavedDrawerOpen);

  const { markers, handleMapClick } = useMapInteractions((lat, lng) => {
    setIsSavedDrawerOpen(false);
    score.fetchLocationScore(lat, lng, selectedMonth, user.uid);
  });

  const handleSelectSaved = (loc: SavedLocation) => {
    setIsSavedDrawerOpen(false);
    score.fetchLocationScore(loc.lat, loc.lng, selectedMonth, user.uid);
  };

  useEffect(() => {
    handleLocate();
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLiveLocation({ lat: latitude, lng: longitude });
        handleMapClick(latitude, longitude);
      },
      (err) => {
        console.warn("Geolocation failed on startup. Using default center.", err.message);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <>
      <MapContainer
        center={[11.1271, 78.6569]}
        zoom={8}
        style={{ height: 'calc(100vh - 48px)', width: '100%', zIndex: 10 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatmapLayer 
          selectedMonth={selectedMonth} 
          showHeatmap={showHeatmap}
          showMarkers={showMarkers}
          onBestSpotFound={(lat, lng, score) => setBestSpot({ lat, lng, score })}
        />
        <MapClickHandler onClick={handleMapClick} />
        {liveLocation && (
          <Marker position={[liveLocation.lat, liveLocation.lng]} icon={liveUserIcon} zIndexOffset={1000} />
        )}
        {showBest && bestSpot && (
          <Marker position={[bestSpot.lat, bestSpot.lng]} icon={bestSpotIcon} zIndexOffset={2000} />
        )}
        {score.activeMarker && score.nearbyFarmers.length > 0 && (
          <DiscoveryPopup 
            farmers={score.nearbyFarmers} 
            position={[score.activeMarker.lat, score.activeMarker.lng]} 
            onClose={() => {}} 
          />
        )}
        {score.activeMarker && <MapPanner center={[score.activeMarker.lat, score.activeMarker.lng]} />}
        {showMarkers && markers.map(m => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={hexIcon} />
        ))}
      </MapContainer>

      <Legend />

      {/* Layer Toggles */}
      <div className="absolute top-20 right-6 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setShowBest(!showBest)}
          className={`w-10 h-10 rounded-xl shadow-lg border flex items-center justify-center transition-all ${
            showBest ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
          }`}
          title="Suggest Optimal Site"
        >
          <Sparkles size={18} />
        </button>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`w-10 h-10 rounded-xl shadow-lg border flex items-center justify-center transition-all ${
            showHeatmap ? 'bg-[#5D0623] text-white border-[#5D0623]' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
          }`}
          title="Toggle Heatmap"
        >
          <MapIcon size={20} />
        </button>
        <button
          onClick={() => setShowMarkers(!showMarkers)}
          className={`w-10 h-10 rounded-xl shadow-lg border flex items-center justify-center transition-all ${
            showMarkers ? 'bg-[#5D0623] text-white border-[#5D0623]' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
          }`}
          title="Toggle Markers"
        >
          <CircleDot size={20} />
        </button>
      </div>

      <LocateButton 
        onClick={handleLocate} 
        loading={score.loading} 
      />

      <SavedLocationsDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        locations={score.locations}
        onSelect={handleSelectSaved}
        onDelete={score.deleteLocation}
      />

      {score.panelOpen && (score.activeMarker || score.loading) && (
        <ScorePanel
          result={score.scoreResult}
          coords={score.activeMarker}
          month={selectedMonth}
          loading={score.loading}
          error={score.error}
          onClose={score.closePanel}
          onSave={() => score.saveCurrentLocation(selectedMonth)}
        />
      )}
    </>
  );
};
