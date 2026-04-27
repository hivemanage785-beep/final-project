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

function getVisibleTiles(bounds, zoom) {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const t1 = latLngToTile(sw.lat, sw.lng, zoom);
  const t2 = latLngToTile(ne.lat, ne.lng, zoom);

  const tiles = [];

  for (let x = Math.min(t1.x, t2.x); x <= Math.max(t1.x, t2.x); x++) {
    for (let y = Math.min(t1.y, t2.y); y <= Math.max(t1.y, t2.y); y++) {
      tiles.push({ x, y, z: zoom });
    }
  }

  return tiles;
}

export { latLngToTile, getTileBounds, getVisibleTiles };
