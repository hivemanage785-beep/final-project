import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat'; // CRITICAL: Ensures (L as any).heatLayer exists
import { fetchHeatmapGrid } from '../api/scoreApi';

interface HeatmapLayerProps {
  selectedMonth: number;
  showHeatmap: boolean;
  onBestSpotFound?: (lat: number, lng: number, score: number) => void;
  showMarkers?: boolean; 
}

// ── Threshold-Based Classification ───────────────────────────────────
const HIGH_THRESHOLD   = 70;
const MEDIUM_THRESHOLD = 40;

function classifyScore(score: number): { color: string; fillColor: string; label: string } {
  if (score >= HIGH_THRESHOLD) {
    return { color: '#15803d', fillColor: '#22c55e', label: 'High Yield' };     // GREEN
  } else if (score >= MEDIUM_THRESHOLD) {
    return { color: '#a16207', fillColor: '#eab308', label: 'Moderate Yield' }; // YELLOW
  } else {
    return { color: '#b91c1c', fillColor: '#ef4444', label: 'Low Yield' };      // RED
  }
}

const DEBOUNCE_MS  = 600;
const BOUNDS_PAD   = 0.3; // Increased padding for better blending on edges

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ selectedMonth, showHeatmap, onBestSpotFound }) => {
  const map            = useMap();
  const layerGroupRef  = useRef<L.LayerGroup | null>(null);
  const heatLayerRef   = useRef<L.Layer | null>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'not_ready'>('idle');

  const removeAll = useCallback(() => {
    if (layerGroupRef.current && map.hasLayer(layerGroupRef.current)) {
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }
    if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
  }, [map]);

  const loadGrid = useCallback(async (b: L.LatLngBounds) => {
    if (!showHeatmap) {
      removeAll();
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStatus('loading');

    const params = {
      lat_min: b.getSouth(),
      lat_max: b.getNorth(),
      lng_min: b.getWest(),
      lng_max: b.getEast()
    };

    try {
      const grid = await fetchHeatmapGrid(selectedMonth, params);
      if (abortRef.current?.signal.aborted) return;

      if (!grid || grid.length === 0) {
        setStatus('not_ready');
        removeAll();
        return;
      }

      // ── Best Spot Finder ─────────────────────────────────────────
      if (grid.length > 0 && onBestSpotFound) {
        let best = grid[0];
        for (const p of grid) {
          if (p[2] > best[2]) best = p;
        }
        onBestSpotFound(best[0], best[1], best[2]);
      }

      removeAll();

      // ── A. Classification Points (Optional) ───────────────
      // We'll skip dense circles if we want a pure "Windy" look, or make them tiny indicators.
      // Keeping them subtle for now.
      const circleGroup = L.layerGroup();
      // Only show markers on high zoom levels to keep it clean
      if (map.getZoom() > 10) {
          for (const [lat, lng, score] of grid) {
            const cls = classifyScore(score);
            L.circleMarker([lat, lng], {
              radius: 4,
              weight: 0.5,
              color: cls.color,
              fillColor: cls.fillColor,
              fillOpacity: 0.4,
              opacity: 0.5
            }).addTo(circleGroup);
          }
          circleGroup.addTo(map);
          layerGroupRef.current = circleGroup;
      }

      // ── B. Smooth Heat Overlay (Windy-like blending) ──────────────
      const scores     = grid.map(p => p[2]);
      const minS       = Math.min(...scores);
      const maxS       = Math.max(...scores);
      const sRange     = maxS - minS || 1;

      const heatPoints = grid.map(p => {
        const [lat, lng, rawScore] = p;
        // Exponential normalization for smoother transitions
        const intensity = Math.pow((rawScore - minS) / sRange, 1.8); 
        return [lat, lng, intensity] as [number, number, number];
      });

      // Windy uses high radius and very high blur for that "watercolor" effect
      const heat = (L as any).heatLayer(heatPoints, {
        radius: 45, // Larger radius for blending
        blur: 35,   // Higher blur for smooth gradients
        max: 0.9,
        maxZoom: 15,
        gradient: {
          0.0: 'rgba(239, 68, 68, 0)',   // Transparent baseline
          0.2: 'rgba(239, 68, 68, 0.4)', // Red (poor)
          0.4: 'rgba(234, 179, 8, 0.5)', // Yellow (fair)
          0.7: 'rgba(34, 197, 94, 0.6)', // Green (good)
          1.0: 'rgba(21, 128, 61, 0.8)'  // Deep Green (excellent)
        }
      }).addTo(map);
      heatLayerRef.current = heat;

      setStatus('idle');

    } catch (err: any) {
      if (err?.name === 'AbortError' || abortRef.current?.signal.aborted) return;
      setStatus('error');
    }
  }, [map, selectedMonth, showHeatmap, removeAll, onBestSpotFound]);

  const scheduleFetch = useCallback((b: L.LatLngBounds) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadGrid(b), DEBOUNCE_MS);
  }, [loadGrid]);

  useEffect(() => {
    if (showHeatmap) {
      scheduleFetch(map.getBounds().pad(BOUNDS_PAD));
    } else {
      removeAll();
    }
  }, [showHeatmap, map, selectedMonth, removeAll, scheduleFetch]);

  useMapEvents({
    moveend: () => {
      if (showHeatmap) scheduleFetch(map.getBounds().pad(BOUNDS_PAD));
    },
    zoomend: () => {
      if (showHeatmap) scheduleFetch(map.getBounds().pad(BOUNDS_PAD));
    }
  });

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      removeAll();
    };
  }, [map, removeAll]);

  return (
    <>
      {status === 'loading' && (
        <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'none' }}
          className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md flex items-center gap-2 text-sm font-medium text-gray-600">
          <div className="w-3 h-3 rounded-full bg-[#5D0623] animate-pulse" />
          Analyzing Map Data...
        </div>
      )}
    </>
  );
};
