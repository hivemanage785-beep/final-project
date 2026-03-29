/**
 * Inspection Repository
 */
import { v4 as uuidv4 } from 'uuid';
import { db, LocalInspection } from '../db';
import { syncQueue } from '../sync/queue';

type InspectionCreateInput = Omit<LocalInspection, 'id' | 'updatedAt' | 'synced' | 'deleted'>;

export const inspectionRepository = {
  async create(input: InspectionCreateInput): Promise<string> {
    const id = uuidv4();
    const now = Date.now();
    const inspection: LocalInspection = { ...input, id, updatedAt: now, synced: false, deleted: false };
    await db.inspections.add(inspection);
    await syncQueue.add({ type: 'CREATE', entity: 'inspection', entityId: id, payload: inspection as unknown as Record<string, unknown> });
    return id;
  },

  async update(id: string, changes: Partial<LocalInspection>): Promise<void> {
    const now = Date.now();
    await db.inspections.update(id, { ...changes, updatedAt: now, synced: false });
    const updated = await db.inspections.get(id);
    if (!updated) return;
    await syncQueue.add({ type: 'UPDATE', entity: 'inspection', entityId: id, payload: updated as unknown as Record<string, unknown> });
  },

  async delete(id: string): Promise<void> {
    await db.inspections.update(id, { deleted: true, updatedAt: Date.now(), synced: false });
    await syncQueue.add({ type: 'DELETE', entity: 'inspection', entityId: id, payload: { id } });
  },

  async getByHiveId(hiveId: string): Promise<LocalInspection[]> {
    return db.inspections.where('hiveId').equals(hiveId).and((i) => !i.deleted).toArray();
  },

  async getAll(): Promise<LocalInspection[]> {
    return db.inspections.filter((i) => !i.deleted).toArray();
  },
};
