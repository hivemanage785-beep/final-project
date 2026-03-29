/**
 * User Repository
 */
import { db, LocalUser } from '../db';
import { syncQueue } from '../sync/queue';

export const userRepository = {
  async upsert(userData: LocalUser): Promise<void> {
    const existing = await db.users.get(userData.id);
    if (existing) {
      await db.users.update(userData.id, { ...userData, synced: false });
    } else {
      await db.users.add({ ...userData, synced: false, deleted: false });
    }
    await syncQueue.add({
      type: existing ? 'UPDATE' : 'CREATE',
      entity: 'user',
      entityId: userData.id,
      payload: userData as unknown as Record<string, unknown>,
    });
  },

  async update(id: string, changes: Partial<LocalUser>): Promise<void> {
    const now = Date.now();
    await db.users.update(id, { ...changes, updatedAt: now, synced: false });
    const updated = await db.users.get(id);
    if (!updated) return;
    await syncQueue.add({ type: 'UPDATE', entity: 'user', entityId: id, payload: updated as unknown as Record<string, unknown> });
  },

  async getById(id: string): Promise<LocalUser | undefined> {
    return db.users.get(id);
  },

  async getAll(): Promise<LocalUser[]> {
    return db.users.filter((u) => !u.deleted).toArray();
  },
};
