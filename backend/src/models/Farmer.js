import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const farmerSchema = new mongoose.Schema({
  farmer_id: { type: String, default: () => randomUUID(), unique: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  crop_type: { type: [String], required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  is_public: { type: Boolean, default: true },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  rating: { type: Number, default: 0 },
  syncVersion: { type: Number, default: 1 }
}, { timestamps: true });

// CRITICAL: 2dsphere index for geospatial querying
farmerSchema.index({ location: '2dsphere' });

export const Farmer = mongoose.model('Farmer', farmerSchema);
