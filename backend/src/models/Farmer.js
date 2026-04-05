import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const farmerSchema = new mongoose.Schema({
  farmer_id: { type: String, default: () => randomUUID(), unique: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  is_public: { type: Boolean, default: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  crop_type: { type: String },
  flowering_season: { type: String },
  rating: { type: Number, default: 0 },
  syncVersion: { type: Number, default: 1 }
}, { timestamps: true });

farmerSchema.index({ lat: 1, lng: 1 });

export const Farmer = mongoose.model('Farmer', farmerSchema);

