/**
 * Sync Queue — v2
 * ─────────────────────────────────────────────────────────
 * Changes from v1:
 *  - Idempotency: dedup by idempotencyKey before inserting
 *  - Priority ordering: high → normal → low
 *  - Persistent SyncLog written after every attempt
 */
import { db, SyncQueueItem, SyncLog, SyncPriority } from '../db';

const PRIORITY_ORDER: Record<SyncPriority, number> = { high: 0, normal: 1, low: 2 };

export const syncQueue = {
  /**
   * Add a new job to the queue.
   * If a job with the same idempotencyKey already exists (and is pending/processing),
   * we silently skip — preventing duplicate writes on retry storms.
   */
  async add(
    item: Omit<SyncQueueItem, 'id' | 'retries' | 'status' | 'createdAt'>,
  ): Promise<number | undefined> {
    // Idempotency check — skip if identical pending/processing job exists
    const existing = await db.syncQueue
      .where('idempotencyKey')
      .equals(item.idempotencyKey)
      .and((i) => i.status === 'pending' || i.status === 'processing')
      .first();

    if (existing) return existing.id;

    return db.syncQueue.add({
      ...item,
      retries: 0,
      status: 'pending',
      createdAt: Date.now(),
    });
  },

  /**
   * Get pending + retryable failed jobs, ordered by priority then age.
   */
  async getPending(): Promise<SyncQueueItem[]> {
    const items = await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .and((item) => item.retries < 5)
      .toArray();

    return items.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 1;
      const pb = PRIORITY_ORDER[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;           // priority first
      return a.createdAt - b.createdAt;         // then oldest first
    });
  },

  /** Get all pending items grouped by entity for batch processing */
  async getPendingGrouped(): Promise<Map<string, SyncQueueItem[]>> {
    const items = await this.getPending();
    const groups = new Map<string, SyncQueueItem[]>();
    for (const item of items) {
      const key = item.entity;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return groups;
  },

  async markProcessing(id: number): Promise<void> {
    await db.syncQueue.update(id, { status: 'processing' });
  },

  async markDone(id: number): Promise<void> {
    await db.syncQueue.delete(id);
  },

  async markFailed(id: number, error: string): Promise<void> {
    const item = await db.syncQueue.get(id);
    if (!item) return;
    const newRetries = item.retries + 1;
    await db.syncQueue.update(id, {
      status: newRetries >= 5 ? 'failed' : 'pending',
      retries: newRetries,
      error,
    });
  },

  async resetFailed(id: number): Promise<void> {
    await db.syncQueue.update(id, { status: 'pending', retries: 0, error: undefined });
  },

  async resetAllFailed(): Promise<void> {
    await db.syncQueue
      .where('status').equals('failed')
      .modify({ status: 'pending', retries: 0, error: undefined });
  },

  // ─── Observability ─────────────────────────────────────────────────────────

  async getStats() {
    const all = await db.syncQueue.toArray();
    return {
      pending:    all.filter((i) => i.status === 'pending').length,
      failed:     all.filter((i) => i.status === 'failed').length,
      processing: all.filter((i) => i.status === 'processing').length,
      total:      all.length,
      retryDepths: all.reduce<Record<number, number>>((acc, i) => {
        acc[i.retries] = (acc[i.retries] ?? 0) + 1;
        return acc;
      }, {}),
    };
  },

  async getAll(): Promise<SyncQueueItem[]> {
    return db.syncQueue.orderBy('createdAt').toArray();
  },

  // ─── Logging ───────────────────────────────────────────────────────────────

  async log(entry: Omit<SyncLog, 'id'>): Promise<void> {
    try {
      await db.syncLogs.add(entry);
    } catch {
      // Never let logging failures break sync
    }
  },

  async getLogs(limit = 50): Promise<SyncLog[]> {
    return db.syncLogs.orderBy('timestamp').reverse().limit(limit).toArray();
  },
};
