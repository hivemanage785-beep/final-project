function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

function getTileBounds(x, y, z) {
  const n = Math.pow(2, z);
  const lng_min = x / n * 360 - 180;
  const latRad_max = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
  const lat_max = latRad_max * 180 / Math.PI;

  const lng_max = (x + 1) / n * 360 - 180;
  const latRad_min = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n)));
  const lat_min = latRad_min * 180 / Math.PI;

  return { lat_min, lat_max, lng_min, lng_max };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function createGridFromPoints(points, resolution, bounds) {
  const { lat_min, lat_max, lng_min, lng_max } = bounds;
  
  const grid = Array.from({ length: resolution }, () => Array(resolution).fill(0));
  
  if (!points || points.length === 0) {
    return grid;
  }

  const latStep = (lat_max - lat_min) / resolution;
  const lngStep = (lng_max - lng_min) / resolution;

  // Scale sigma with tile size so Gaussian spreads correctly at every zoom level
  const tileWidthKm  = haversineKm(lat_min, lng_min, lat_min, lng_max);
  const tileHeightKm = haversineKm(lat_min, lng_min, lat_max, lng_min);
  const tileSizeKm   = (tileWidthKm + tileHeightKm) / 2;
  const sigma        = Math.max(1, tileSizeKm * 0.1);

  for (let r = 0; r < resolution; r++) {
    for (let c = 0; c < resolution; c++) {
      const cellLat = lat_max - (r * latStep);
      const cellLng = lng_min + (c * lngStep);

      let sumScoreWeight = 0;
      let sumWeight      = 0;

      for (const [pLat, pLng, pScore] of points) {
        if (pScore == null || isNaN(pScore)) continue;

        const dist   = haversineKm(cellLat, cellLng, pLat, pLng);
        const weight = Math.exp(-(dist * dist) / (2 * sigma * sigma));

        sumScoreWeight += pScore * weight;
        sumWeight      += weight;
      }

      // Every cell gets a value — no hard threshold cuts
      grid[r][c] = sumWeight > 0
        ? Math.max(0, Math.min(1, sumScoreWeight / sumWeight))
        : 0;
    }
  }

  // Density log
  let filled = 0;
  for (const row of grid) {
    for (const val of row) {
      if (val > 0) filled++;
    }
  }
  console.log(`FILLED CELLS: ${filled} / ${resolution * resolution}`);

  return grid;
}

export {
  latLngToTile,
  getTileBounds,
  createGridFromPoints
};
