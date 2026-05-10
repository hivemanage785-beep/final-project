import mongoose from 'mongoose';

export const GeoPointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], required: true, default: 'Point' },
  coordinates: { type: [Number], required: true } // EXACTLY [longitude, latitude]
}, { _id: false });
