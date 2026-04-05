/**
 * Tile Key Strategy:
 * Snap lat/lng to nearest 0.02° (~2.2km) grid boundary.
 * This ensures predictable, cache-able tile keys across the region.
 */
export function toTileKey(lat, lng, month) {
  const snapLat = (Math.round(lat / 0.02) * 0.02).toFixed(2);
  const snapLng = (Math.round(lng / 0.02) * 0.02).toFixed(2);
  return `${snapLat}_${snapLng}_${month}`;
}

export function toTileCoords(lat, lng) {
  const snapLat = parseFloat((Math.round(lat / 0.02) * 0.02).toFixed(2));
  const snapLng = parseFloat((Math.round(lng / 0.02) * 0.02).toFixed(2));
  return { lat: snapLat, lng: snapLng };
}
