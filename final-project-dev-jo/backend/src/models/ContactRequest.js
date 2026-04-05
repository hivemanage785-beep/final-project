import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const contactRequestSchema = new mongoose.Schema({
  request_id: { type: String, default: () => randomUUID(), unique: true, index: true },
  requester_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  farmer_id: { type: String, required: true, index: true }, // refers to Farmer.farmer_id (UUID)
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approved_by: { type: String }, // Admin user ID
  approved_at: { type: Date }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const ContactRequest = mongoose.model('ContactRequest', contactRequestSchema);
