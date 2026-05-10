import { Batch } from './batch.model.js';
import crypto from 'crypto';
import { generateQRDataURL } from '../../common/qrGenerator.js';

const sanitize = (str) => String(str || '').replace(/[<>"']/g, '').trim().slice(0, 500);
const approxCoord = (v) => parseFloat((Math.round(v / 0.05) * 0.05).toFixed(2));

export const harvestService = {
  async createHarvest(payload, user) {
    const { hive_id, flora, harvest_date, hive_count, notes, lat, lng } = payload;
    const batch_id = crypto.randomUUID();
    const publicId = crypto.randomBytes(12).toString('hex');

    const newDoc = await Batch.create({
      batch_id,
      publicId,
      beekeeper_id:   user.id,
      beekeeper_name: user.displayName || 'Partner Beekeeper',
      hive_id:   sanitize(hive_id),
      flora:     sanitize(flora),
      harvest_date: harvest_date || new Date(),
      hive_count: hive_count || 1,
      notes:     sanitize(notes),
      lat: lat || 0,
      lng: lng || 0,
    });

    if (!process.env.FRONTEND_URL) throw new Error("FRONTEND_URL is not configured");
    const traceUrl = `${process.env.FRONTEND_URL}/trace/${newDoc.publicId}`;

    newDoc.qrUrl     = traceUrl;
    newDoc.is_locked = true;
    newDoc.locked_at = new Date();
    await newDoc.save();

    const qrDataUrl = await generateQRDataURL(traceUrl);

    return {
      batch_id:   newDoc.batch_id,
      publicId:   newDoc.publicId,
      traceUrl,
      qrDataUrl,
      is_locked:  newDoc.is_locked,
      locked_at:  newDoc.locked_at,
      verification_status: newDoc.verification_status,
      harvest_date: newDoc.harvest_date,
      flora: newDoc.flora,
    };
  },

  async getHarvestTrace(lookupId) {
    const batch = await Batch.findOne({ publicId: lookupId })
                ?? await Batch.findOne({ batch_id: lookupId });
    
    if (!batch) return null;

    return {
      publicId:            batch.publicId,
      harvest_date:        batch.harvest_date,
      flora:               sanitize(batch.flora),
      hive_count:          batch.hive_count,
      location: {
        lat_approx: approxCoord(batch.lat),
        lng_approx: approxCoord(batch.lng),
        note: 'Location approximate within 5km for beekeeper privacy'
      },
      beekeeper_name:      sanitize(batch.beekeeper_name),
      quality_notes:       sanitize(batch.notes),
      verification_status: batch.verification_status,
      certification_id:    batch.certification_id || null,
      verified_at:         batch.verified_at || null,
      is_locked:           batch.is_locked,
      createdAt:           batch.createdAt,
    };
  },

  async getMyHarvests(userId) {
    return await Batch.find({ beekeeper_id: userId })
      .sort({ createdAt: -1 })
      .select('-lat -lng -__v')
      .lean();
  },

  async verifyBatch(publicId, status, certification_id, adminUserId) {
    const batch = await Batch.findOne({ publicId });
    if (!batch) return null;

    batch.verification_status = status;
    batch.certification_id    = sanitize(certification_id || '');
    batch.verified_by         = adminUserId;
    batch.verified_at         = new Date();
    await batch.save();

    return {
      publicId:            batch.publicId,
      verification_status: batch.verification_status,
      certification_id:    batch.certification_id,
      verified_at:         batch.verified_at,
    };
  }
};
