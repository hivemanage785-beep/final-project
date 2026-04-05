import Dexie, { type Table } from 'dexie';

export interface OfflineFarmer {
  _id: string;
  name: string;
  cropTypes: string[];
  lat: number;
  lng: number;
  contact: string;
  is_public: boolean;
  last_synced: number;
}

export class BuzzOffDatabase extends Dexie {
  farmers!: Table<OfflineFarmer>;

  constructor() {
    super('BuzzOffDatabase');
    this.version(2).stores({
      farmers: '_id, name, lat, lng, last_synced' 
    });
  }
}

export const db = new BuzzOffDatabase();

// Sync online fetched farmers to IndexedDB cache
export async function saveFarmersOffline(farmers: any[]) {
  const now = Date.now();
  // Transform data ensuring explicit lat/lng extraction for easier offline querying
  const payload = farmers.map(f => ({
    _id: f._id || f.farmer_id || f.id,
    name: f.name,
    cropTypes: f.crop_type || f.cropTypes || [],
    lat: f.location?.coordinates[1] || f.lat,
    lng: f.location?.coordinates[0] || f.lng,
    contact: f.phone || f.contact || "",
    is_public: f.is_public ?? true,
    last_synced: now
  }));
  
  // Update local cache
  await db.farmers.bulkPut(payload);
}

// Fallback search logic using basic trigonometry
export async function getOfflineFarmers(targetLng: number, targetLat: number, radiusKm = 50) {
  const offlineData = await db.farmers.toArray();
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  
  return offlineData.filter(farmer => {
    // Purge logic isolated inside filter:
    if (now - (farmer.last_synced || 0) > SEVEN_DAYS_MS) return false;
    
    if (farmer.lng === undefined || farmer.lat === undefined) return false;
    
    // Haversine formula calculation
    const R = 6371; // Earth radius in km
    const dLat = (farmer.lat - targetLat) * (Math.PI / 180);
    const dLon = (farmer.lng - targetLng) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(targetLat * (Math.PI / 180)) * Math.cos(farmer.lat * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    
    return distanceKm <= radiusKm;
  });
}
