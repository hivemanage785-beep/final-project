import mongoose from 'mongoose';

const hiveSchema = new mongoose.Schema({
  _id: { type: String }, // Explicitly allow string IDs from frontend sync
  uid: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  hive_id: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  box_count: { type: Number, default: 1 },
  queen_status: { type: String, enum: ['healthy', 'missing', 'replaced'], default: 'healthy' },
  health_status: { type: String, enum: ['good', 'fair', 'poor'], default: 'good' },
  last_inspection_date: { type: Date },
  notes: { type: String },
  syncVersion: { type: Number, default: 1 }
}, { 
  timestamps: true,
  id: true, // virtual id from _id
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

hiveSchema.index({ uid: 1 });
hiveSchema.index({ ownerId: 1, hive_id: 1 });

export const Hive = mongoose.model('Hive', hiveSchema);
