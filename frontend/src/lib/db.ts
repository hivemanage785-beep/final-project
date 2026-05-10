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
  placement_location_id?: string;
  placement_location_name?: string;
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

export interface SavedLocation {
  id: string;
  uid: string;
  name?: string;
  lat: number;
  lng: number;
  score: number;
  suitability_label: string;
  grade: string;
  timestamp: string;
  month?: number;
}

export interface Alert {
  id: string;
  uid: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  source: string;
  unread: boolean;
  category: string;
  timestamp: string;
}

export class AppDatabase extends Dexie {
  hives!: Table<Hive, string>;
  harvests!: Table<Harvest, string>;
  inspections!: Table<Inspection, string>;
  outbox!: Table<SyncOperation, number>;
  savedLocations!: Table<SavedLocation, string>;
  alerts!: Table<Alert, string>;

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

    // Version 5 — added alerts (legacy — missing uid index)
    this.version(5).stores({
      hives:       'id, uid, hive_id, last_inspection_date',
      harvests:    'id, uid, hive_id, batch_id, publicId',
      inspections: 'id, uid, hive_id, date',
      outbox:      '++id, entity, action, timestamp, dedupKey',
      savedLocations: 'id, uid, month, timestamp',
      alerts:      'id, type, unread, category, timestamp'
    });

    // Version 6 — hardened alerts with uid index for isolation
    this.version(6).stores({
      hives:       'id, uid, hive_id, last_inspection_date',
      harvests:    'id, uid, hive_id, batch_id, publicId',
      inspections: 'id, uid, hive_id, date',
      outbox:      '++id, entity, action, timestamp, dedupKey',
      savedLocations: 'id, uid, month, timestamp',
      alerts:      'id, uid, type, unread, category, timestamp'
    });
  }
}

// ── Constants ────────────────────────────────────────────────────────────────
const OUTBOX_BACKUP_KEY = 'idb_outbox_backup';
const IDB_RECOVERY_KEY  = 'idb_recovery_attempted';

// ── Singleton factory ────────────────────────────────────────────────────────
function createDB(): AppDatabase {
  const db = new AppDatabase();

  /**
   * 'blocked' fires on THIS (upgrading) tab when a DIFFERENT open tab holds
   * the old DB version and has not yet called db.close().
   * Action: log only — data is safe. The other tab's 'versionchange' handler
   * (added below) will close it, unblocking this upgrade automatically.
   */
  db.on('blocked', () => {
    console.warn(
      '[DB] Schema upgrade blocked — another HiveOps tab holds an older DB version. ' +
      'It will release automatically. If this persists, close other tabs and refresh.'
    );
  });

  /**
   * 'versionchange' fires on THIS tab's open DB when ANOTHER tab opens a
   * newer schema version. We must close our connection to unblock their upgrade.
   *
   * Multi-tab upgrade lifecycle:
   *   Tab A (old): DB v4 open, versionchange fires → db.close() releases handle.
   *   Tab B (new): DB v5 upgrade was blocked → now unblocked → upgrade completes.
   *   Tab A: DB is now closed. On next user interaction, Tab A will fail DB ops
   *           and should be refreshed. We log a clear warning.
   *
   * We do NOT reload Tab A automatically here — an unexpected reload during user
   * interaction is more disruptive than a console warning.
   */
  db.on('versionchange', () => {
    console.warn(
      '[DB] A newer version of HiveOps is open in another tab. ' +
      'Releasing DB connection to allow schema upgrade. Please refresh this tab.'
    );
    db.close();
  });

  return db;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Attempt to read all pending outbox operations and serialize them to
 * localStorage BEFORE any destructive Dexie.delete() call.
 *
 * This only succeeds if the DB handle is still partially readable
 * (e.g. UpgradeError where old data survived). For genuine corruption
 * (UnknownError), db.outbox.toArray() will throw — caught and logged.
 * In that case deletion still proceeds; we do not abort recovery.
 */
async function backupOutboxBeforeDelete(dbInstance: AppDatabase): Promise<void> {
  try {
    const ops = await dbInstance.outbox.toArray();
    if (ops.length > 0) {
      // Strip auto-increment IDs — they will be re-assigned on bulkAdd after restore.
      const stripped = ops.map(({ id: _id, ...rest }) => rest);
      localStorage.setItem(OUTBOX_BACKUP_KEY, JSON.stringify(stripped));
      console.info(`[DB] Backed up ${ops.length} outbox operations to localStorage before recovery.`);
    }
  } catch (readErr) {
    // DB is unreadable — backup not possible. Continue with deletion regardless.
    console.warn('[DB] Could not read outbox before recovery (DB likely unreadable):', readErr);
  }
}

/**
 * After a successful db.open(), check whether a previous recovery left an
 * outbox backup in localStorage and restore those operations into the fresh DB.
 *
 * Auto-increment IDs are not restored — Dexie assigns new ones via bulkAdd.
 * dedupKey is preserved so the sync engine can still deduplicate on replay.
 */
async function restoreOutboxBackup(dbInstance: AppDatabase): Promise<void> {
  try {
    const raw = localStorage.getItem(OUTBOX_BACKUP_KEY);
    if (!raw) return;

    const ops: Omit<SyncOperation, 'id'>[] = JSON.parse(raw);
    if (ops.length > 0) {
      await dbInstance.outbox.bulkAdd(ops as SyncOperation[]);
      console.info(`[DB] Restored ${ops.length} pending outbox operations from pre-recovery backup.`);
    }
    localStorage.removeItem(OUTBOX_BACKUP_KEY);
  } catch (restoreErr) {
    console.error('[DB] Failed to restore outbox backup:', restoreErr);
    // Remove corrupted backup — do not retry with bad data.
    localStorage.removeItem(OUTBOX_BACKUP_KEY);
  }
}

// ── Singleton instance ───────────────────────────────────────────────────────
export let db = createDB();

/**
 * Open the DB, restore any backed-up outbox on success, or handle errors
 * with a discriminated recovery strategy.
 *
 * Error discrimination:
 *
 *   CASE 1 — Version downgrade (OpenFailedError/VersionError inner):
 *     User opened an older build after a newer one stored v5 data.
 *     Action: log only. No delete, no reload. Safe — user must clear data manually.
 *
 *   CASE 2 — Stale connection / browser policy (DatabaseClosedError, InvalidStateError):
 *     Non-destructive. DB data is intact. A reload re-establishes the connection.
 *     Action: reload once (sessionStorage guard prevents loop). No delete.
 *
 *   CASE 3 — Schema mismatch / genuine corruption (UpgradeError, UnknownError, other):
 *     Last resort. Attempt outbox backup, close DB, delete, set guard, reload once.
 *     Outbox is restored from localStorage on the next successful open.
 *
 * Infinite-loop protection:
 *   IDB_RECOVERY_KEY in sessionStorage is checked before any reload.
 *   It is set immediately before reload and cleared on the next recovery entry,
 *   ensuring at most one automatic reload per error chain.
 */
db.open()
  .then(() => restoreOutboxBackup(db))
  .catch(async (err: any) => {
    const errorName: string = err?.name ?? 'UnknownError';
    console.error(`[DB] IndexedDB open failed (${errorName}):`, err);

    // ── CASE 1: Version downgrade ─────────────────────────────────────────
    if (errorName === 'OpenFailedError' && err?.inner?.name === 'VersionError') {
      console.warn('[DB] Version downgrade attempted. Clear site data manually to resolve.');
      return; // No delete. No reload. No data risk.
    }

    // ── CASE 2: Stale connection / browser security policy ────────────────
    if (errorName === 'DatabaseClosedError' || errorName === 'InvalidStateError') {
      console.warn(`[DB] Non-destructive IDB error (${errorName}). Reloading to restore connection.`);
      if (typeof window !== 'undefined') {
        if (sessionStorage.getItem(IDB_RECOVERY_KEY)) {
          console.error('[DB] Recovery already attempted this session. Skipping reload to prevent loop.');
          sessionStorage.removeItem(IDB_RECOVERY_KEY);
          return;
        }
        sessionStorage.setItem(IDB_RECOVERY_KEY, '1');
        window.location.reload();
      }
      return;
    }

    // ── CASE 3: Schema mismatch / genuine corruption (last resort) ────────
    if (sessionStorage.getItem(IDB_RECOVERY_KEY)) {
      console.error('[DB] Recovery already attempted this session. Halting to prevent loop.');
      sessionStorage.removeItem(IDB_RECOVERY_KEY);
      return; // App degrades to online-only. No further destructive action.
    }

    try {
      // Step 1: Attempt to backup outbox BEFORE closing (while handle may still be valid).
      await backupOutboxBeforeDelete(db);

      // Step 2: Release all locks. Must happen BEFORE Dexie.delete().
      console.warn('[DB] Closing DB instance before safe deletion...');
      db.close();

      // Step 3: Delete the corrupted database.
      console.warn('[DB] Deleting corrupted IndexedDB. Pending ops backed up to localStorage for restore.');
      await Dexie.delete('HiveOpsOfflineDB');

      // Step 4: Set loop guard AFTER deletion success, BEFORE reload.
      sessionStorage.setItem(IDB_RECOVERY_KEY, '1');

      // Step 5: One reload. Guard prevents this from repeating.
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (deleteErr) {
      console.error('[DB] Safe recovery failed during deletion:', deleteErr);
      // Do not retry. App runs in online-only degraded mode.
    }
  });

