/**
 * Local-First Database (Dexie / IndexedDB) — v2
 * Adds: idempotencyKey, priority, batchId to SyncQueueItem
 *       SyncLog table for observability
 *       archived table for old records
 */
import Dexie, { Table } from 'dexie';

// ─── Entity Types ─────────────────────────────────────────────────────────────

export interface LocalUser {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'beekeeper';
  status: 'pending' | 'approved';
  hasSeenTour: boolean;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  deleted: boolean;
}

export interface LocalHive {
  id: string;
  name: string;
  apiary: string;
  status: 'active' | 'harvested' | 'relocated';
  health: number;
  temp: number;
  humidity: number;
  lastHarvest?: number;
  locationLat?: number;
  locationLng?: number;
  userId: string;
  updatedAt: number;
  synced: boolean;
  deleted: boolean;
}

export interface LocalInspection {
  id: string;
  hiveId: string;
  inspectorUid: string;
  timestamp: number;
  queenSpotted: boolean;
  broodFrames: number;
  miteCount: number;
  aggression: 'low' | 'medium' | 'high';
  notes: string;
  audioBlob?: ArrayBuffer;
  audioUrl?: string;
  userId: string;
  updatedAt: number;
  synced: boolean;
  deleted: boolean;
}

export interface LocalHarvest {
  id: string;
  batchId: string;
  hiveId: string;
  apiary: string;
  quantity: number;
  floraType: string;
  purity: number;
  moisture: number;
  terroir: string;
  hash: string;
  timestamp: number;
  userId: string;
  updatedAt: number;
  synced: boolean;
  deleted: boolean;
}

export interface LocalAlert {
  id: string;
  hiveId?: string;
  type: 'temp_spike' | 'treatment_due' | 'low_battery';
  message: string;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
  resolved: boolean;
  userId: string;
  updatedAt: number;
  synced: boolean;
  deleted: boolean;
}

// ─── Sync Queue (v2) ──────────────────────────────────────────────────────────

export type SyncPriority = 'high' | 'normal' | 'low';
export type SyncStatus = 'pending' | 'processing' | 'failed' | 'done';

export interface SyncQueueItem {
  id?: number;                       // auto-increment PK
  idempotencyKey: string;            // stable UUID per unique mutation — prevents duplicate writes
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'user' | 'hive' | 'inspection' | 'harvest' | 'alert';
  entityId: string;
  payload: Record<string, unknown>;
  priority: SyncPriority;            // high=0, normal=1, low=2 — engine sorts ascending
  retries: number;
  status: SyncStatus;
  error?: string;
  batchId?: string;                  // set by engine when grouping into a Firestore writeBatch
  createdAt: number;
}

// ─── Observability ────────────────────────────────────────────────────────────

export interface SyncLog {
  id?: number;
  queueItemId?: number;
  idempotencyKey: string;
  entity: string;
  entityId: string;
  type: string;
  status: 'success' | 'failure';
  retries: number;
  message?: string;
  timestamp: number;
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export interface ArchivedRecord {
  id?: number;
  originalId: string;
  table: string;
  data: Record<string, unknown>;
  archivedAt: number;
}

// ─── Database ─────────────────────────────────────────────────────────────────

class BuzzOffDatabase extends Dexie {
  users!: Table<LocalUser, string>;
  hives!: Table<LocalHive, string>;
  inspections!: Table<LocalInspection, string>;
  harvests!: Table<LocalHarvest, string>;
  alerts!: Table<LocalAlert, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  syncLogs!: Table<SyncLog, number>;
  archived!: Table<ArchivedRecord, number>;

  constructor() {
    super('BuzzOffDB');

    // v1 — original schema
    this.version(1).stores({
      users:       'id, role, status, updatedAt, synced, deleted',
      hives:       'id, status, apiary, userId, updatedAt, synced, deleted',
      inspections: 'id, hiveId, inspectorUid, timestamp, userId, updatedAt, synced, deleted',
      harvests:    'id, hiveId, batchId, apiary, userId, updatedAt, synced, deleted',
      alerts:      'id, hiveId, type, priority, resolved, userId, updatedAt, synced, deleted',
      syncQueue:   '++id, type, entity, entityId, status, retries, createdAt',
    });

    // v2 — adds idempotencyKey, priority, batchId to syncQueue; new syncLogs + archived tables
    this.version(2).stores({
      users:       'id, role, status, updatedAt, synced, deleted',
      hives:       'id, status, apiary, userId, updatedAt, synced, deleted',
      inspections: 'id, hiveId, inspectorUid, timestamp, userId, updatedAt, synced, deleted',
      harvests:    'id, hiveId, batchId, apiary, userId, updatedAt, synced, deleted',
      alerts:      'id, hiveId, type, priority, resolved, userId, updatedAt, synced, deleted',
      syncQueue:   '++id, idempotencyKey, type, entity, entityId, status, priority, retries, createdAt',
      syncLogs:    '++id, idempotencyKey, entity, entityId, status, timestamp',
      archived:    '++id, originalId, table, archivedAt',
    }).upgrade((tx) => {
      // Migrate existing queue rows to add new required fields
      return tx.table('syncQueue').toCollection().modify((item) => {
        if (!item.idempotencyKey) item.idempotencyKey = `legacy-${item.id}`;
        if (!item.priority) item.priority = 'normal';
      });
    });
  }
}

export const db = new BuzzOffDatabase();
