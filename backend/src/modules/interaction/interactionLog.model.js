import mongoose from 'mongoose';

const interactionLogSchema = new mongoose.Schema({
  finalScore: { type: Number },
  lat: { type: Number },
  lng: { type: Number },
  feedback: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const InteractionLog = mongoose.model('InteractionLog', interactionLogSchema);
