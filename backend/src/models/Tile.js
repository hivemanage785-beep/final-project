import mongoose from 'mongoose';

const tileSchema = new mongoose.Schema({
  z: { type: Number, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  month: { type: Number, required: true },
  gridSize: { type: Number, default: 32 },
  grid: { type: [[Number]], required: true },
  createdAt: { type: Date, default: Date.now }
});

tileSchema.index({ z: 1, x: 1, y: 1, month: 1, gridSize: 1 }, { unique: true });

export default mongoose.models.Tile || mongoose.model('Tile', tileSchema);
