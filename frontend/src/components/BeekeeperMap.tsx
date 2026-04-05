import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import api from '../api/axiosInstance';
import { getOfflineFarmers, saveFarmersOffline, OfflineFarmer } from '../lib/offlinedb';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon issue in react-leaflet
import iconMarkerRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconMarkerRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
});

// TAMIL NADU COORDINATES (Chennai)
const DEFAULTS = {
    lat: 13.0827,
    lng: 80.2707,
    zoom: 8
};

interface BeekeeperMapProps {
  onFarmersFetched?: (data: any) => void;
  selectedMonth?: number;
}

/**
 * Centering Layer: Handles live geolocation updates smoothly
 */
function MapController({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 12, { animate: true, duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

function MapClickListener({ setFarmers, onFarmersFetched }: { setFarmers: (f: any) => void, onFarmersFetched?: (d: any) => void }) {
  useMapEvents({
    click: async (e) => {
      const { lng, lat } = e.latlng;
      try {
        if (navigator.onLine) {
          const res = await api.get(`/api/farmers/nearby?lng=${lng}&lat=${lat}`);
          if (res.data && res.data.success) {
            setFarmers(res.data.data);
            saveFarmersOffline(res.data.data);
            if (onFarmersFetched) onFarmersFetched(res.data.data);
          }
        } else {
          // Fallback offline computation
          const localFarmers = await getOfflineFarmers(lng, lat);
          setFarmers(localFarmers);
          if (onFarmersFetched) onFarmersFetched(localFarmers);
        }
      } catch (err) {
        console.error("Error fetching nearby farmers", err);
      }
    }
  });
  return null;
}

import MarkerClusterGroup from 'react-leaflet-cluster';
import { HeatmapLayer } from './HeatmapLayer';

export default function BeekeeperMap({ onFarmersFetched, selectedMonth = 1 }: BeekeeperMapProps) {
  const [farmers, setFarmers] = useState<OfflineFarmer[]>([]);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);

  // 1. Live Geolocation Tracker
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    // High accuracy watch — but we only flyTo once on start unless user asks
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setUserLoc([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.warn("Geolocation failed or denied", err),
        { enableHighAccuracy: true }
    );
  }, []);

  return (
    <div className="w-full h-full relative border rounded-lg overflow-hidden shadow-sm">
      <MapContainer 
        center={[DEFAULTS.lat, DEFAULTS.lng]} // Tamil Nadu focus
        zoom={DEFAULTS.zoom} 
        style={{ height: "100%", width: "100%", minHeight: "500px" }}
      >
        <TileLayer 
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        />
        
        {/* Syncs map state with live location */}
        <MapController center={userLoc} />

        <MapClickListener setFarmers={setFarmers} onFarmersFetched={onFarmersFetched} />
        
        {/* ML Density Heatmap directly overlaying farmers */}
        <HeatmapLayer selectedMonth={selectedMonth} showHeatmap={true} />

        {/* Pulsing User Marker */}
        {userLoc && (
            <Marker 
                position={userLoc} 
                icon={L.divIcon({
                    className: 'user-marker',
                    html: `<div class="pulse-marker"></div>`,
                    iconSize: [20, 20]
                })}
            />
        )}

        <MarkerClusterGroup chunkedLoading>
          {farmers.map(farmer => {
              const lng = farmer.lng !== undefined ? farmer.lng : (farmer as any).location?.coordinates[0];
              const lat = farmer.lat !== undefined ? farmer.lat : (farmer as any).location?.coordinates[1];
              
              if (lat === undefined || lng === undefined) return null;

              return (
                <Marker key={farmer._id} position={[lat, lng]}>
                  <Popup>
                    <div className="font-semibold">{farmer.name}</div>
                    <div className="text-sm text-gray-600">
                      Crops: {
                        Array.isArray(farmer.cropTypes) 
                          ? farmer.cropTypes.join(', ') 
                          : (farmer as any).crop_type?.join(', ') || 'Unknown'
                      }
                    </div>
                  </Popup>
                </Marker>
              );
          })}
        </MarkerClusterGroup>
      </MapContainer>
      <div className="absolute top-2 right-2 p-2 bg-white/90 shadow text-xs font-semibold rounded z-[400] text-gray-700">
        Click anywhere to find nearby farmers
      </div>
      
      <style>{`
        .pulse-marker {
            width: 14px;
            height: 14px;
            background-color: #5D0623;
            border: 2px solid white;
            border-radius: 50%;
            position: relative;
        }
        .pulse-marker::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background-color: #5D0623;
            opacity: 0.6;
            animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        }
        @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.6; }
            80%, 100% { transform: scale(3.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
