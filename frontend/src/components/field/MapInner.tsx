import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Navigation, Search, Loader2 } from 'lucide-react';

import { ScorePanel } from '../../modules/field/ScorePanel';
import { SavedLocationsDrawer } from '../../modules/field/SavedLocationsDrawer';
import { AddHiveSheet } from '../../modules/hives/AddHiveSheet';
import { useScore } from '../../hooks/useScore';
import { useSavedLocations } from '../../hooks/useSavedLocations';
import { liveUserIcon, crosshairIcon } from '../../hooks/useMapInteractions';
import { StrategicPlanningSheet } from '../../modules/hives/StrategicPlanningSheet';
import { apiGet, apiPost } from '../../services/api';

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

/* ── Internal components ── */
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

export interface MapInnerProps { selectedMonth: number; user: any; }

export const MapInner: React.FC<MapInnerProps> = ({ selectedMonth, user }) => {
  const [isSavedOpen,  setIsSavedOpen]  = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [panTarget,    setPanTarget]    = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady,     setMapReady]     = useState(false);
  const [tileError,    setTileError]    = useState(false);
  const [suggestions,  setSuggestions]  = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isAddHiveOpen, setIsAddHiveOpen] = useState(false);
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);

  const { locations, saveLocation, deleteLocation } = useSavedLocations(user?.uid);
  const [preselectedLocationId, setPreselectedLocationId] = useState<string | undefined>(undefined);
  const {
    fetchLocationScore,
    scoreResult, loading: scoreLoading,
    panelOpen, closePanel,
    saveCurrentLocation,
    error: scoreError,
    activeMarker,
  } = useScore(user, () => {});

  const fetchSuggestions = useCallback(async (lat: number, lng: number) => {
    try {
      const data = await apiGet(`/api/suggestions?lat=${lat}&lng=${lng}&month=${selectedMonth}`);
      if (Array.isArray(data)) setSuggestions(data);
    } catch (err) {
      console.warn('Suggestions failed to load.');
    }
  }, [selectedMonth]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!user) return;
    setSelectedLocation({ lat, lng });
    await fetchLocationScore(lat, lng, selectedMonth, user.uid);
  }, [user, selectedMonth, fetchLocationScore]);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      fetchSuggestions(11.1271, 78.6569);
      return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLiveLocation(loc);
      setPanTarget(loc);
      fetchSuggestions(loc.lat, loc.lng);
    }, () => fetchSuggestions(11.1271, 78.6569));
  }, [fetchSuggestions]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPanTarget({ lat, lng });
        fetchSuggestions(lat, lng);
      }
    } catch (err) {
      console.error('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => { handleLocate(); }, [handleLocate]);

  // ── Operational Logic (Optimization/Simulation) ──
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);

  const handleOptimize = async () => {
    setIsPlanningOpen(true);
    setIsSavedOpen(false);
  };

  const handleUseLocationForHive = async () => {
    if (!activeMarker || !scoreResult) return;
    
    // Check if this specific coordinate set is already in Saved Locations
    const existing = locations.find(l => 
      Math.abs(l.lat - activeMarker.lat) < 0.0001 && 
      Math.abs(l.lng - activeMarker.lng) < 0.0001
    );
    
    if (existing) {
      setPreselectedLocationId(existing.id);
      setIsAddHiveOpen(true);
    } else {
      // Auto-save the analyzed location so it can be linked to the new hive
      const newLoc = await saveLocation({
        lat: activeMarker.lat,
        lng: activeMarker.lng,
        score: scoreResult.score,
        grade: scoreResult.grade,
        month: selectedMonth,
        suitability_label: scoreResult.suitability_label || 'Analyzed Zone'
      });
      if (newLoc) {
        setPreselectedLocationId(newLoc.id);
        setIsAddHiveOpen(true);
      }
    }
  };

  return (
    <div className="map-wrapper" style={{ position: 'relative', height: '100%', background: '#F8FAFC', overflow: 'hidden' }}>
      {/* Map loading overlay */}
      {!mapReady && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={32} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>INITIALIZING FIELD ENGINE...</p>
          </div>
        </div>
      )}

      {/* Connectivity status */}
      {tileError && (
        <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(15, 23, 42, 0.85)', color: 'white', padding: '6px 14px', borderRadius: 20, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FCD34D' }} /> MAP CONNECTIVITY LIMITED
        </div>
      )}

      {/* Search Bar */}
      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1000 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, background: 'white', padding: '8px 16px', borderRadius: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0' }}>
          <Search size={18} color="#94A3B8" />
          <input
            type="text"
            placeholder="Explore Tamil Nadu flora zones..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14, fontWeight: 500, color: '#1E293B' }}
          />
          {searchLoading && <Loader2 size={16} className="animate-spin text-slate-400" />}
        </form>
      </div>

      <MapContainer
        center={[11.1271, 78.6569]}
        zoom={7}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={false}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false)
          }}
        />

        <ClickHandler onPick={handleMapClick} />
        <MapPanner target={panTarget} />

        {liveLocation && <Marker position={[liveLocation.lat, liveLocation.lng]} icon={liveUserIcon} zIndexOffset={1000} />}
        {panelOpen && activeMarker && <Marker position={[activeMarker.lat, activeMarker.lng]} icon={crosshairIcon} />}

        {suggestions.map((sug, i) => (
          <Marker 
            key={`${i}-${sug.lat}`} 
            position={[sug.lat, sug.lng]} 
            icon={getSuggestionIcon(sug.score)}
            eventHandlers={{ click: () => handleMapClick(sug.lat, sug.lng) }}
          />
        ))}
      </MapContainer>

      {/* FABs - Adjusted for mobile visibility */}
      <div className="map-fabs" style={{ bottom: panelOpen ? 'auto' : 32, top: panelOpen ? 84 : 'auto', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <button className="fab fab-white shadow-lg" onClick={() => setIsSavedOpen(true)}>
          <Layers size={20} color="#64748B" />
        </button>
        <button className="fab fab-primary shadow-lg" onClick={handleLocate}>
          <Navigation size={20} color="white" />
        </button>
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
        onRetry={() => activeMarker && handleMapClick(activeMarker.lat, activeMarker.lng)}
        onUseLocation={handleUseLocationForHive}
      />

      {isAddHiveOpen && selectedLocation && (
      <AddHiveSheet 
          isOpen={isAddHiveOpen} 
          onClose={() => { setIsAddHiveOpen(false); setPreselectedLocationId(undefined); }} 
          onAdded={() => { setIsAddHiveOpen(false); setPreselectedLocationId(undefined); }}
          initialLat={selectedLocation.lat}
          initialLng={selectedLocation.lng}
          initialLocationId={preselectedLocationId}
        />
      )}

      <SavedLocationsDrawer
        isOpen={isSavedOpen}
        onClose={() => setIsSavedOpen(false)}
        locations={locations}
        onDelete={deleteLocation}
        onSelect={loc => { setPanTarget({ lat: loc.lat, lng: loc.lng }); setIsSavedOpen(false); }}
        onOptimize={handleOptimize}
      />

      <StrategicPlanningSheet 
        isOpen={isPlanningOpen}
        onClose={() => setIsPlanningOpen(false)}
        locations={locations}
      />
    </div>
  );
};


