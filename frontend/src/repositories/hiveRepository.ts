/**
 * Hive Repository
 * The ONLY way the UI should interact with hive data.
 * Writes go to Dexie first, then queue for Firestore sync.
 */
import { v4 as uuidv4 } from 'uuid';
import { db, LocalHive } from '../db';
import { syncQueue } from '../sync/queue';

type HiveCreateInput = Omit<LocalHive, 'id' | 'updatedAt' | 'synced' | 'deleted'>;
type HiveUpdateInput = Partial<Omit<LocalHive, 'id' | 'updatedAt' | 'synced' | 'deleted'>>;

export const hiveRepository = {
  /** Create a new hive locally and enqueue for sync */
  async create(input: HiveCreateInput): Promise<string> {
    const id = uuidv4();
    const now = Date.now();
    const hive: LocalHive = { ...input, id, updatedAt: now, synced: false, deleted: false };
    await db.hives.add(hive);
    await syncQueue.add({ type: 'CREATE', entity: 'hive', entityId: id, payload: hive as unknown as Record<string, unknown> });
    return id;
  },

  /** Update a hive locally and enqueue for sync */
  async update(id: string, changes: HiveUpdateInput): Promise<void> {
    const now = Date.now();
    await db.hives.update(id, { ...changes, updatedAt: now, synced: false });
    const updated = await db.hives.get(id);
    if (!updated) return;
    await syncQueue.add({ type: 'UPDATE', entity: 'hive', entityId: id, payload: updated as unknown as Record<string, unknown> });
  },

  /** Soft-delete a hive locally and enqueue for sync */
  async delete(id: string): Promise<void> {
    const now = Date.now();
    await db.hives.update(id, { deleted: true, updatedAt: now, synced: false });
    await syncQueue.add({ type: 'DELETE', entity: 'hive', entityId: id, payload: { id } });
  },

  /** Get a single hive by ID */
  async getById(id: string): Promise<LocalHive | undefined> {
    return db.hives.get(id);
  },

  /** Get all non-deleted hives */
  async getAll(): Promise<LocalHive[]> {
    return db.hives.filter((h) => !h.deleted).toArray();
  },
};
