/**
 * Harvest Repository
 */
import { v4 as uuidv4 } from 'uuid';
import { db, LocalHarvest } from '../db';
import { syncQueue } from '../sync/queue';

type HarvestCreateInput = Omit<LocalHarvest, 'id' | 'updatedAt' | 'synced' | 'deleted'>;

export const harvestRepository = {
  async create(input: HarvestCreateInput): Promise<string> {
    const id = uuidv4();
    const now = Date.now();
    const harvest: LocalHarvest = { ...input, id, updatedAt: now, synced: false, deleted: false };
    await db.harvests.add(harvest);
    await syncQueue.add({ type: 'CREATE', entity: 'harvest', entityId: id, payload: harvest as unknown as Record<string, unknown> });
    return id;
  },

  async update(id: string, changes: Partial<LocalHarvest>): Promise<void> {
    const now = Date.now();
    await db.harvests.update(id, { ...changes, updatedAt: now, synced: false });
    const updated = await db.harvests.get(id);
    if (!updated) return;
    await syncQueue.add({ type: 'UPDATE', entity: 'harvest', entityId: id, payload: updated as unknown as Record<string, unknown> });
  },

  async delete(id: string): Promise<void> {
    await db.harvests.update(id, { deleted: true, updatedAt: Date.now(), synced: false });
    await syncQueue.add({ type: 'DELETE', entity: 'harvest', entityId: id, payload: { id } });
  },

  async getAll(): Promise<LocalHarvest[]> {
    return db.harvests.filter((h) => !h.deleted).reverse().toArray();
  },

  async getByHiveId(hiveId: string): Promise<LocalHarvest[]> {
    return db.harvests.where('hiveId').equals(hiveId).and((h) => !h.deleted).toArray();
  },
};
