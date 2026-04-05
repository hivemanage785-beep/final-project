import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { fetchHeatmapGrid } from '../api/scoreApi';

interface HeatmapLayerProps {
  selectedMonth: number;
  showHeatmap: boolean;
  onBestSpotFound?: (lat: number, lng: number, score: number) => void;
  showMarkers?: boolean; 
}

const DEBOUNCE_MS     = 600;
const BOUNDS_PAD      = 0.2;

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ selectedMonth, showHeatmap, onBestSpotFound }) => {
  const map           = useMap();
  const heatLayerRef  = useRef<L.Layer | null>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [data, setData]     = useState<[number, number, number][]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'not_ready'>('idle');

  const removeHeatmap = useCallback(() => {
    if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
  }, [map]);

  const loadGrid = useCallback(async (b: L.LatLngBounds) => {
    if (!showHeatmap) {
      removeHeatmap();
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
        setData([]);
        removeHeatmap();
        return;
      }

      setData(grid);

      // Identify localized best spot (Optimal Placement Suggestion)
      if (grid.length > 0 && onBestSpotFound) {
        let best = grid[0];
        for (const p of grid) {
          if (p[2] > best[2]) best = p;
        }
        onBestSpotFound(best[0], best[1], best[2]);
      }

      // Rule 1: Normalize intensity = score / 100
      const heatPoints = grid.map(p => {
        const [lat, lng, score] = p;
        return [lat, lng, score / 100] as [number, number, number];
      });

      removeHeatmap();

      // Rule 2: Heatmap Configuration
      const heat = (L as any).heatLayer(heatPoints, {
        radius: 30,
        blur: 20,
        max: 1.0,
        maxZoom: 17,
        gradient: {
          0.2: "blue",
          0.4: "lime",
          0.6: "yellow",
          0.8: "orange",
          1.0: "red"
        }
      }).addTo(map);

      heatLayerRef.current = heat;
      setStatus('idle');

    } catch (err: any) {
      if (err?.name === 'AbortError' || abortRef.current?.signal.aborted) return;
      setStatus('error');
      console.error('[HeatmapGrid] Load failed:', err?.message);
    }
  }, [map, selectedMonth, showHeatmap, removeHeatmap]);

  const scheduleFetch = useCallback((b: L.LatLngBounds) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadGrid(b), DEBOUNCE_MS);
  }, [loadGrid]);

  useEffect(() => {
    if (showHeatmap) {
      scheduleFetch(map.getBounds().pad(BOUNDS_PAD));
    } else {
      removeHeatmap();
      setData([]);
    }
  }, [showHeatmap, map, selectedMonth, removeHeatmap, scheduleFetch]);

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
      removeHeatmap();
    };
  }, [map, removeHeatmap]);

  return (
    <>
      {status === 'loading' && (
        <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'none' }}
          className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md flex items-center gap-2 text-sm font-medium text-gray-600">
          <div className="w-3 h-3 rounded-full bg-[#5D0623] animate-pulse" />
          Updating continuous surface...
        </div>
      )}
    </>
  );
};
