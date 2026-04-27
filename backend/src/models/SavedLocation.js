import mongoose from 'mongoose';

const savedLocationSchema = new mongoose.Schema({
  _id: { type: String }, // UUID from frontend
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  uid: { type: String, required: true, index: true }, // Firebase UID
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  score: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  syncVersion: { type: Number, default: 1 },
  created_at: { type: Date, default: Date.now },
}, {
  timestamps: false,
  id: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

savedLocationSchema.index({ uid: 1, created_at: -1 });

export const SavedLocation = mongoose.model('SavedLocation', savedLocationSchema);
