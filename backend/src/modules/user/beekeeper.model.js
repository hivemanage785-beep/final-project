import mongoose from 'mongoose';

const beekeeperSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'beekeeper'], 
    default: 'beekeeper' 
  },
  createdAt: { type: Date, default: Date.now }
});

export const Beekeeper = mongoose.model('Beekeeper', beekeeperSchema);
