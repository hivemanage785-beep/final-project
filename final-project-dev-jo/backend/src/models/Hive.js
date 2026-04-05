import mongoose from 'mongoose';

const hiveSchema = new mongoose.Schema({
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
}, { timestamps: true });

hiveSchema.index({ uid: 1 });
hiveSchema.index({ ownerId: 1, hive_id: 1 });

export const Hive = mongoose.model('Hive', hiveSchema);

