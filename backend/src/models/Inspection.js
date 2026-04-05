import mongoose from 'mongoose';

const inspectionSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  hive_id: { type: String, required: true },
  date: { type: Date, required: true },
  notes: { type: String },
  box_count: { type: Number },
  queen_status: { type: String },
  health_status: { type: String },
  syncVersion: { type: Number, default: 1 }
}, { timestamps: true });

export const Inspection = mongoose.model('Inspection', inspectionSchema);
