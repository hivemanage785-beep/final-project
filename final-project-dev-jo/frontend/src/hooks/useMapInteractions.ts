import { useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Hex-shaped marker icon for analyzed points
export const hexIcon = new L.DivIcon({
  html: `<div style="background-color: #5D0623; width: 22px; height: 26px; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [22, 26],
  iconAnchor: [11, 26],
});

// Pulsing blue dot for live user location
export const liveUserIcon = new L.DivIcon({
  html: `
    <div style="position: relative; width: 20px; height: 20px;">
      <div style="position: absolute; top:0; left:0; width: 20px; height: 20px; background-color: #2563eb; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(37,99,235,0.5); z-index: 2;"></div>
      <div style="position: absolute; top:0; left:0; width: 20px; height: 20px; background-color: #2563eb; border-radius: 50%; animation: pulse 2s infinite; opacity: 0.5; z-index: 1;"></div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          70% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      </style>
    </div>
  `,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10], // Center the pulse dot
});

// Gold star icon for best suggested location
export const bestSpotIcon = new L.DivIcon({
  html: `<div style="color: #fbbf24; filter: drop-shadow(0 0 10px rgba(251,191,36,0.8));">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface Marker {
  lat: number;
  lng: number;
  id: string;
}

interface UseMapInteractionsReturn {
  markers: Marker[];
  handleMapClick: (lat: number, lng: number) => void;
}

export function useMapInteractions(
  onLocationSelected: (lat: number, lng: number) => void
): UseMapInteractionsReturn {
  const [markers, setMarkers] = useState<Marker[]>([]);

  const handleMapClick = (lat: number, lng: number) => {
    const newMarker = { lat, lng, id: Math.random().toString() };
    setMarkers(prev => {
      const updated = [...prev, newMarker];
      return updated.length > 3 ? updated.slice(updated.length - 3) : updated;
    });
    onLocationSelected(lat, lng);
  };

  return { markers, handleMapClick };
}
