import mongoose from 'mongoose';

/**
 * GeoTile: stores precomputed environmental data for a ~5km grid cell.
 * Key: quantized lat/lng to 2 decimal places (~1.1km precision, clustered into 5km buckets via rounding to 0.05).
 */
const GeoTileSchema = new mongoose.Schema({
  tileKey:     { type: String, required: true, unique: true, index: true }, // e.g. "11.05_78.65"
  lat:         { type: Number, required: true },
  lng:         { type: Number, required: true },
  month:       { type: Number, required: true }, // 1-12

  // Environmental features (precomputed from external APIs)
  avgTemp:     { type: Number, default: null },
  avgRain:     { type: Number, default: null },
  avgWind:     { type: Number, default: null },
  avgHumidity: { type: Number, default: null },
  floraCount:  { type: Number, default: null },
  ndvi:        { type: Number, default: null }, // null if NDVI_UNAVAILABLE

  // ML inference pre-run
  mlScore:       { type: Number, default: null },
  mlRisk:        { type: Number, default: null },
  mlConfidence:  { type: Number, default: null },
  mlWarning:     { type: String, default: null },
  mlModel:       { type: String, default: null },

  computedAt:  { type: Date, default: Date.now },
  ttlExpires:  { type: Date, default: () => new Date(Date.now() + 6 * 60 * 60 * 1000) } // 6h TTL
}, { timestamps: true });

// Auto-expire documents via MongoDB TTL index
GeoTileSchema.index({ ttlExpires: 1 }, { expireAfterSeconds: 0 });

export const GeoTile = mongoose.model('GeoTile', GeoTileSchema);
