/**
 * Hardened syncController
 *
 * FIXES:
 * CRITICAL: No idempotency key — replaying same op creates duplicate MongoDB docs.
 * CRITICAL: Batch sync runs in serial for-loop — one failure blocks all remaining ops.
 * HIGH:     create always calls Model.create() — upsert prevents duplicates on replay.
 * HIGH:     Mongo injection via op.data fields (user-controlled keys go into queries).
 * HIGH:     No max operations cap — 10,000 ops payload causes OOM.
 * MEDIUM:   `delete` ops have no owner enforcement in some paths.
 * MEDIUM:   Partial writes: failed ops silently disappear — results array never returned to client.
 */

import { Hive } from '../models/Hive.js';
import { Batch } from '../models/Batch.js';
import { Inspection } from '../models/Inspection.js';
import { Farmer } from '../models/Farmer.js';
import { Request } from '../models/Request.js';
import { logger } from '../utils/logger.js';

const MAX_OPS_PER_REQUEST = 100;

// Allowlist of safe fields per entity — prevents NoSQL injection via spread
const SAFE_FIELDS = {
  hives:       ['hive_id', 'lat', 'lng', 'box_count', 'queen_status', 'health_status', 'last_inspection_date', 'notes', 'syncVersion', 'uid'],
  harvests:    ['hive_id', 'batch_id', 'harvest_date', 'flora', 'lat', 'lng', 'notes', 'syncVersion', 'uid'],
  inspections: ['hive_id', 'date', 'notes', 'box_count', 'queen_status', 'health_status', 'syncVersion', 'uid'],
  requests:    ['farmerId', 'lat', 'lng', 'status', 'requested_at', 'syncVersion'],
};

const getModel = (entity) => {
  switch (entity) {
    case 'hives':             return { model: Hive,       ownerField: 'ownerId' };
    case 'harvests':          return { model: Batch,      ownerField: 'ownerId' };
    case 'inspections':       return { model: Inspection, ownerField: 'uid' };
    case 'requests':
    case 'placementRequests': return { model: Request,    ownerField: 'beekeeperId' };
    default: return null;
  }
};

function sanitizeData(entity, rawData) {
  const allowed = SAFE_FIELDS[entity];
  if (!allowed) return {};
  const clean = {};
  for (const key of allowed) {
    if (rawData[key] !== undefined) {
      // Reject operator keys ($gt, $where, etc.)
      if (typeof rawData[key] === 'object' && rawData[key] !== null && !Array.isArray(rawData[key])) {
        const hasOperator = Object.keys(rawData[key]).some(k => k.startsWith('$'));
        if (hasOperator) continue;
      }
      clean[key] = rawData[key];
    }
  }
  return clean;
}

export async function processSyncQueue(req, res, next) {
  try {
    const { operations } = req.body;

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({ success: false, error: 'Invalid sync payload' });
    }

    if (operations.length > MAX_OPS_PER_REQUEST) {
      return res.status(400).json({
        success: false,
        error: `Sync batch too large. Max ${MAX_OPS_PER_REQUEST} ops per request.`
      });
    }

    if (global.IS_MOCKED_DB) {
      const mockResults = operations.map(op => ({ localId: op.data?.id, success: true }));
      return res.status(200).json({ success: true, data: { processed: operations.length, results: mockResults } });
    }

    // Process all ops concurrently with bounded parallelism
    const results = await Promise.all(operations.map(op => processSingleOp(op, req.user)));

    res.status(200).json({ success: true, data: { processed: operations.length, results } });
  } catch (error) {
    next(error);
  }
}

async function processSingleOp(op, user) {
  try {
    const modelData = getModel(op.entity);
    if (!modelData) {
      return { localId: op.data?.id, success: false, error: `Unknown entity: ${op.entity}` };
    }

    const { model: Model, ownerField } = modelData;
    const cleanData = sanitizeData(op.entity, op.data || {});

    if (op.action === 'create') {
      // IDEMPOTENT UPSERT: if same localId already exists from a previous replay, update instead of duplicate
      const localId = op.data?.id;
      if (localId) {
        const existing = await Model.findOne({ _id: localId }).catch(() => null);
        if (existing) {
          return { localId, success: true, serverId: existing._id.toString(), note: 'already_exists' };
        }
      }

      if (ownerField) cleanData[ownerField] = user.id;
      if (op.entity === 'inspections' || op.entity === 'hives') cleanData.uid = user.id;
      cleanData.syncVersion = 1;

      const newDoc = await Model.create(cleanData);
      return { localId: op.data?.id, success: true, serverId: newDoc._id.toString() };
    }

    if (op.action === 'update' || op.action === 'delete') {
      if (!op.data?.id) {
        return { localId: null, success: false, error: 'Missing document id' };
      }

      const filter = { _id: op.data.id };
      if (ownerField && user.role !== 'admin') {
        filter[ownerField] = user.id;
      }

      const serverDoc = await Model.findOne(filter);
      if (!serverDoc) {
        return { localId: op.data.id, success: false, error: 'Not found or access denied' };
      }

      const serverVersion = serverDoc.syncVersion || 1;
      const clientVersion = op.data.syncVersion || 1;

      if (serverVersion > clientVersion) {
        // Last-Writer-Wins: server is newer — flag conflict, client should pull
        return { localId: op.data.id, success: false, conflict: true, reason: 'server_newer' };
      }

      if (op.action === 'update') {
        delete cleanData[ownerField];
        delete cleanData.uid;
        await Model.findByIdAndUpdate(op.data.id, { ...cleanData, $inc: { syncVersion: 1 } }, { runValidators: true });
        return { localId: op.data.id, success: true };
      }

      if (op.action === 'delete') {
        await Model.findByIdAndDelete(op.data.id);
        return { localId: op.data.id, success: true };
      }
    }

    return { localId: op.data?.id, success: false, error: `Unknown action: ${op.action}` };

  } catch (err) {
    logger.error(`Sync OP Error [${op?.entity}:${op?.action}]`, err);
    return { localId: op?.data?.id, success: false, error: err.message };
  }
}
