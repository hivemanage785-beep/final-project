import mongoose from 'mongoose';
import { GeoPointSchema } from '../core/BaseSchemas.model.js';

const savedLocationSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // UUID from frontend
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  uid: { type: String, required: true, index: true }, // Firebase UID
  location: { type: GeoPointSchema, required: true },
  score: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  syncVersion: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: false,
  id: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// CRITICAL: 2dsphere index
savedLocationSchema.index({ "location": "2dsphere" });
savedLocationSchema.index({ uid: 1, createdAt: -1 });

export const SavedLocation = mongoose.model('SavedLocation', savedLocationSchema);
