import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  farmerId: { type: String, required: true },
  beekeeperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  lat: { type: Number },
  lng: { type: Number },
  requested_at: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 }
}, { timestamps: true });

requestSchema.index({ beekeeperId: 1 });
requestSchema.index({ status: 1 });

export const Request = mongoose.model('Request', requestSchema);

