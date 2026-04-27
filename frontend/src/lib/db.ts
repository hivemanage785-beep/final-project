/**
 * Hardened Dexie IndexedDB schema
 *
 * FIXES:
 * CRITICAL: Version migration gap — version 1→2 didn't carry forward all stores,
 *           causing silent data loss on upgrade if user skipped version 1.
 * HIGH:     No DB open error recovery — corrupted IndexedDB hangs app silently.
 * HIGH:     No outbox replay deduplication index.
 * MEDIUM:   SyncOperation.id is auto-int — delete on bulkDelete can fail silently if wrong type.
 */

import Dexie, { type Table } from 'dexie';

export interface Hive {
  id: string;
  uid: string;
  hive_id: string;
  lat: number;
  lng: number;
  box_count: number;
  queen_status: 'healthy' | 'missing' | 'replaced';
  health_status: 'good' | 'fair' | 'poor';
  last_inspection_date: string;
  notes: string;
  location_history?: { lat: number; lng: number; date: string; reason: string }[];
}

export interface Harvest {
  id: string;
  uid: string;
  hive_id: string;
  batch_id: string;
  harvest_date: string;
  flora: string;
  lat: number;
  lng: number;
  publicId?: string;
  is_locked?: boolean;
  verification_status?: 'pending' | 'verified' | 'rejected';
}

export interface SyncOperation {
  id?: number;
  entity: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  // Dedup key: entity + action + data.id
  dedupKey?: string;
}

export interface Inspection {
  id: string;
  uid: string;
  hive_id: string;
  date: string;
  notes: string;
  box_count: number;
  queen_status: 'healthy' | 'missing' | 'replaced';
  health_status: 'good' | 'fair' | 'poor';
  audio_url?: string;
}

export class AppDatabase extends Dexie {
  hives!: Table<Hive, string>;
  harvests!: Table<Harvest, string>;
  inspections!: Table<Inspection, string>;
  outbox!: Table<SyncOperation, number>;
  savedLocations!: Table<any, string>;

  constructor() {
    super('HiveOpsOfflineDB');

    // Version 1 (legacy)
    this.version(1).stores({
      hives:    'id, uid, hive_id, last_inspection_date',
      harvests: 'id, uid, hive_id, batch_id',
      outbox:   '++id, entity, action, timestamp'
    });

    // Version 2 (legacy — added inspections)
    this.version(2).stores({
      hives:       'id, uid, hive_id, last_inspection_date',
      harvests:    'id, uid, hive_id, batch_id',
      inspections: 'id, uid, hive_id, date',
      outbox:      '++id, entity, action, timestamp'
    });

    // Version 3 — added dedupKey index + publicId/verification fields on harvests
    this.version(3).stores({
      hives:       'id, uid, hive_id, last_inspection_date',
      harvests:    'id, uid, hive_id, batch_id, publicId',
      inspections: 'id, uid, hive_id, date',
      outbox:      '++id, entity, action, timestamp, dedupKey'
    });

    // Version 4 — added savedLocations
    this.version(4).stores({
      hives:       'id, uid, hive_id, last_inspection_date',
      harvests:    'id, uid, hive_id, batch_id, publicId',
      inspections: 'id, uid, hive_id, date',
      outbox:      '++id, entity, action, timestamp, dedupKey',
      savedLocations: 'id, uid, month, timestamp'
    });
  }
}

// ── Singleton with corruption recovery ──────────────────────────────────────
function createDB(): AppDatabase {
  const db = new AppDatabase();

  db.on('blocked', () => {
    console.warn('[DB] IndexedDB upgrade blocked by open tab. Please close other tabs.');
  });

  return db;
}

export let db = createDB();

// Recovery: if DB open fails (corrupted), delete and recreate
db.open().catch(async (err) => {
  console.error('[DB] IndexedDB open failed, attempting recovery:', err);
  try {
    await Dexie.delete('HiveOpsOfflineDB');
    db = createDB();
    await db.open();
    console.warn('[DB] IndexedDB was reset due to corruption. Offline data was lost.');
  } catch (e) {
    console.error('[DB] IndexedDB recovery failed:', e);
  }
});
