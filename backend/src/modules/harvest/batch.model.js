import mongoose from 'mongoose';

const BatchSchema = new mongoose.Schema({
  _id:              { type: String },                 // support UUID/id from frontend sync
  batch_id:          { type: String, required: true, unique: true },   // UUID (duplicate of _id often)
  publicId:          { type: String, required: true, unique: true },   // short hex for QR URL

  // Ownership
  beekeeper_id:      { type: String, required: true },                 // uid from auth
  beekeeper_name:    { type: String, default: 'Partner Beekeeper' },
  hive_id:           { type: String, required: true },

  // Harvest Data
  harvest_date:      { type: Date, required: true },
  flora:             { type: String, required: true },
  hive_count:        { type: Number, default: 1 },
  notes:             { type: String, default: '' },

  // Location — stored full precision, EXPOSED as approx only
  lat:               { type: Number, required: true },
  lng:               { type: Number, required: true },

  // Lifecycle State
  verification_status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  certification_id:  { type: String, default: null },
  verified_by:       { type: String, default: null },
  verified_at:       { type: Date,   default: null },

  // Locking (tamper-proof)
  is_locked:         { type: Boolean, default: false },
  locked_at:         { type: Date,   default: null },
  qrUrl:             { type: String, default: null },

}, { 
  timestamps: true,
  id: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ── Indexes ──────────────────────────────────────────────────────────────────
BatchSchema.index({ batch_id: 1 });
BatchSchema.index({ publicId: 1 });
BatchSchema.index({ beekeeper_id: 1, createdAt: -1 });

// ── Locking guard: reject any field update after lock ────────────────────────
BatchSchema.pre('save', function (next) {
  if (this.isNew) return next();

  const ALLOWED_AFTER_LOCK = new Set([
    'verification_status','certification_id','verified_by','verified_at'
  ]);

  if (this.is_locked) {
    const modified = this.modifiedPaths();
    const illegal = modified.filter(p => !ALLOWED_AFTER_LOCK.has(p) && p !== 'is_locked' && p !== 'qrUrl');
    if (illegal.length > 0) {
      const err = new Error('BATCH_LOCKED');
      err.status = 403;
      return next(err);
    }
  }
  next();
});

export const Batch = mongoose.model('Batch', BatchSchema);
