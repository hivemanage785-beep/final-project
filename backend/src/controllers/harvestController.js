import { Batch } from '../models/Batch.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import { generateQRDataURL } from '../lib/qrGenerator.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sanitize = (str) => String(str || '').replace(/[<>"']/g, '').trim().slice(0, 500);

// Approx location ±0.05° fuzz (~5km) for public exposure — never exact
const approxCoord = (v) => parseFloat((Math.round(v / 0.05) * 0.05).toFixed(2));

// ─── POST /api/harvests — Create batch ───────────────────────────────────────
export async function createHarvest(req, res, next) {
  try {
    const { hive_id, flora, harvest_date, hive_count, notes, lat, lng } = req.body;

    // UUID v4 — NOT sequential, prevents enumeration
    const batch_id = crypto.randomUUID();
    const publicId = crypto.randomBytes(12).toString('hex'); // 24-char hex

    const newDoc = await Batch.create({
      batch_id,
      publicId,
      beekeeper_id:   req.user.id,
      beekeeper_name: req.user.displayName || 'Partner Beekeeper',
      hive_id:   sanitize(hive_id),
      flora:     sanitize(flora),
      harvest_date: harvest_date || new Date(),
      hive_count: hive_count || 1,
      notes:     sanitize(notes),
      lat: lat || 0,
      lng: lng || 0,
    });

    // Generate QR pointing to public trace page
    const traceUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/trace/${newDoc.publicId}`;

    // Lock immediately when QR is generated — tamper-proof from this moment
    newDoc.qrUrl     = traceUrl;
    newDoc.is_locked = true;
    newDoc.locked_at = new Date();
    await newDoc.save();

    // Generate QR image as base64 data URL (no network call)
    const qrDataUrl = await generateQRDataURL(traceUrl);

    res.status(201).json({
      success: true,
      data: {
        batch_id:   newDoc.batch_id,
        publicId:   newDoc.publicId,
        traceUrl,
        qrDataUrl,
        is_locked:  newDoc.is_locked,
        locked_at:  newDoc.locked_at,
        verification_status: newDoc.verification_status,
        harvest_date: newDoc.harvest_date,
        flora: newDoc.flora,
      }
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/batches/trace/:publicId — Public consumer trace ────────────────
export async function getHarvestTrace(req, res, next) {
  try {
    const lookupId = req.params.batch_id || req.params.id;

    const batch = await Batch.findOne({ publicId: lookupId })
                ?? await Batch.findOne({ batch_id: lookupId });

    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    // ── Public-safe output — sanitized + approx location ─────────────────────
    const safeData = {
      publicId:            batch.publicId,
      harvest_date:        batch.harvest_date,
      flora:               sanitize(batch.flora),
      hive_count:          batch.hive_count,
      // Approximate location — ±0.05° fuzzing, NOT exact GPS
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

    res.status(200).json({ success: true, data: safeData });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/harvests — Beekeeper's own batches ─────────────────────────────
export async function getMyHarvests(req, res, next) {
  try {
    const batches = await Batch.find({ beekeeper_id: req.user.id })
      .sort({ createdAt: -1 })
      .select('-lat -lng -__v')  // exclude exact coords even from auth'd response
      .lean();

    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/batch/verify — Admin only ─────────────────────────────────────
export async function verifyBatch(req, res, next) {
  try {
    const { publicId, status, certification_id } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Use: verified | rejected' });
    }

    const batch = await Batch.findOne({ publicId });
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    // Only allowed fields after lock — enforced by schema pre-save hook too
    batch.verification_status = status;
    batch.certification_id    = sanitize(certification_id || '');
    batch.verified_by         = req.user.id;
    batch.verified_at         = new Date();
    await batch.save();

    logger.info(`[Batch] ${publicId} marked ${status} by admin ${req.user.id}`);

    res.status(200).json({
      success: true,
      data: {
        publicId:            batch.publicId,
        verification_status: batch.verification_status,
        certification_id:    batch.certification_id,
        verified_at:         batch.verified_at,
      }
    });
  } catch (error) {
    if (error.message === 'BATCH_LOCKED') {
      return res.status(403).json({ success: false, error: 'BATCH_LOCKED', message: 'This batch is locked and cannot be modified.' });
    }
    next(error);
  }
}
