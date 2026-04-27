/**
 * DeckHeatmapLayer
 *
 * STABILISATION STATE:
 *   - ScalarFieldLayer (custom GPU shader) is DISABLED.
 *   - Replaced with standard BitmapLayer + CPU-side color mapping.
 *   - No custom shader injection, no setUniforms, no WebGL pipeline risk.
 *   - Re-enable ScalarFieldLayer only after isolated GPU debugging.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import DeckGL from '@deck.gl/react';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { apiGet } from '../services/api';

interface DeckHeatmapLayerProps {
  selectedMonth: number;
  onError?: () => void;
}

// ─────────────────────────────────────────────────────────────
// DISABLED: ScalarFieldLayer (custom WebGL shader)
// Reason: shader injection causes GPU pipeline crash.
// Status: isolated — do NOT re-enable without GPU debugging.
// ─────────────────────────────────────────────────────────────
//
// class ScalarFieldLayer extends BitmapLayer { ... }
//

// ─────────────────────────────────────────────────────────────
// CPU-side color mapping (replaces GPU shader)
// Red → Yellow → Green gradient matching original palette.
// ─────────────────────────────────────────────────────────────
function scalarToRGB(v: number): [number, number, number] {
  // v: 0.0 → 1.0
  if (v < 0.5) {
    // Red [215,48,39] → Yellow [254,224,139]
    const t = v * 2;
    return [
      Math.round(215 + (254 - 215) * t),
      Math.round(48  + (224 -  48) * t),
      Math.round(39  + (139 -  39) * t),
    ];
  } else {
    // Yellow [254,224,139] → Green [26,152,80]
    const t = (v - 0.5) * 2;
    return [
      Math.round(254 + (26  - 254) * t),
      Math.round(224 + (152 - 224) * t),
      Math.round(139 + (80  - 139) * t),
    ];
  }
}

// Global tile canvas cache — survives re-renders but not tab changes.
const tileTextureCache = new Map<string, HTMLCanvasElement>();

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
const DeckHeatmapLayer: React.FC<DeckHeatmapLayerProps> = ({ selectedMonth, onError }) => {
  const map = useMap();

  const [viewState, setViewState] = useState({
    longitude: map.getCenter().lng,
    latitude:  map.getCenter().lat,
    zoom:      map.getZoom(),
    pitch:     0,
    bearing:   0,
  });

  // Keep deck.gl viewState in sync with Leaflet
  useEffect(() => {
    const sync = () => setViewState({
      longitude: map.getCenter().lng,
      latitude:  map.getCenter().lat,
      zoom:      map.getZoom(),
      pitch:     0,
      bearing:   0,
    });
    map.on('move', sync);
    return () => { map.off('move', sync); };
  }, [map]);

  const tileLayer = useMemo(() => new TileLayer({
    id: `heatmap-stable-${selectedMonth}`,
    minZoom: 2,
    maxZoom: 18,
    tileSize: 256,
    maxRequests: 6,
    refinementStrategy: 'no-overlap',

    getTileData: async ({ index }: any) => {
      const { x, y, z } = index;
      const cacheKey = `${z}-${x}-${y}-${selectedMonth}`;

      if (tileTextureCache.has(cacheKey)) return tileTextureCache.get(cacheKey)!;

      try {
        const json = await apiGet(`/api/tile/${z}/${x}/${y}?month=${selectedMonth}`);
        const grid = json?.data;
        if (!grid || grid.length === 0) return null;

        const rows = grid.length;
        const cols = grid[0].length;
        const canvas = document.createElement('canvas');
        canvas.width  = cols;
        canvas.height = rows;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const imgData = ctx.createImageData(cols, rows);
        const px = imgData.data;

        for (let iy = 0; iy < rows; iy++) {
          for (let ix = 0; ix < cols; ix++) {
            const raw = grid[iy][ix];

            // Skip no-data cells (transparent)
            if (raw < 0.05) {
              const i = (iy * cols + ix) * 4;
              px[i + 3] = 0; // fully transparent
              continue;
            }

            // GPU curve approximation — apply on CPU instead
            const v = Math.min(1, Math.max(0, Math.pow(raw, 0.85)));
            const [r, g, b] = scalarToRGB(v);
            const i = (iy * cols + ix) * 4;
            px[i]     = r;
            px[i + 1] = g;
            px[i + 2] = b;
            px[i + 3] = 178; // ~70% opacity (matches original shader's 0.7 alpha)
          }
        }

        ctx.putImageData(imgData, 0, 0);
        tileTextureCache.set(cacheKey, canvas);
        return canvas;
      } catch {
        if (onError) onError();
        return null;
      }
    },

    renderSubLayers: (props: any) => {
      const { data, tile } = props;

      // Guard: no data or no tile bounds → render nothing safely
      if (!data || !tile?.bbox) return null;

      const { west, south, east, north } = tile.bbox;

      // Use standard BitmapLayer — no custom shader, no WebGL pipeline risk
      return new BitmapLayer(props, {
        id: `${props.id}-bitmap`,
        data: null, // explicit null
        image: data,
        bounds: [west, south, east, north],
        textureParameters: {
          minFilter: 'linear',
          magFilter: 'linear',
        },
        // Opacity already baked into canvas pixel alpha (178/255 ≈ 0.7)
        opacity: 1.0,
        parameters: {
          blend:     true,
          blendFunc: [0x0302, 0x0303], // SRC_ALPHA, ONE_MINUS_SRC_ALPHA
        },
      });
    },
  }), [selectedMonth]);

  return (
    <div
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 500, pointerEvents: 'none',
      }}
    >
      <DeckGL
        width="100%"
        height="100%"
        viewState={viewState}
        layers={[tileLayer]}
        useDevicePixels={false}
        controller={false}
      />
    </div>
  );
};

export default DeckHeatmapLayer;
