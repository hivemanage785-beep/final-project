import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  displayName: { type: String },
  role: { type: String, enum: ['admin', 'beekeeper'], default: 'beekeeper' },
  isVerified: { type: Boolean, default: false },
  syncVersion: { type: Number, default: 1 }
}, { timestamps: true });

userSchema.index({ firebaseUid: 1 });
userSchema.index({ email: 1 });

export const User = mongoose.model('User', userSchema);
