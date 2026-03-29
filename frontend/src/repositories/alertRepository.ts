/**
 * Alert Repository
 */
import { v4 as uuidv4 } from 'uuid';
import { db, LocalAlert } from '../db';
import { syncQueue } from '../sync/queue';

type AlertCreateInput = Omit<LocalAlert, 'id' | 'updatedAt' | 'synced' | 'deleted'>;

export const alertRepository = {
  async create(input: AlertCreateInput): Promise<string> {
    const id = uuidv4();
    const now = Date.now();
    const alert: LocalAlert = { ...input, id, updatedAt: now, synced: false, deleted: false };
    await db.alerts.add(alert);
    await syncQueue.add({ type: 'CREATE', entity: 'alert', entityId: id, payload: alert as unknown as Record<string, unknown> });
    return id;
  },

  async resolve(id: string): Promise<void> {
    const now = Date.now();
    await db.alerts.update(id, { resolved: true, updatedAt: now, synced: false });
    const updated = await db.alerts.get(id);
    if (!updated) return;
    await syncQueue.add({ type: 'UPDATE', entity: 'alert', entityId: id, payload: updated as unknown as Record<string, unknown> });
  },

  async getActive(): Promise<LocalAlert[]> {
    return db.alerts.filter((a) => !a.resolved && !a.deleted).reverse().toArray();
  },

  async getAll(): Promise<LocalAlert[]> {
    return db.alerts.filter((a) => !a.deleted).reverse().toArray();
  },
};
