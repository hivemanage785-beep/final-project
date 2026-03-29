/**
 * Reactive Hooks — v2
 * Data flows: UI → useLiveQuery (Dexie) ONLY. Never Firestore.
 * New: useSyncMetrics and useSyncLogs for the upgraded debug panel.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect } from 'react';
import { db, LocalHive, LocalHarvest, LocalAlert, LocalInspection, LocalUser } from '../db';
import { getOnlineStatus, onSyncEvent, SyncEvent, getSyncMetrics } from '../sync/engine';

// ─── Re-export types from database for hooks consistency ───────
export type { LocalHive, LocalHarvest, LocalAlert, LocalInspection, LocalUser };
export type { SyncEvent };

// ─── Hives ────────────────────────────────────────────────────────────────────

export function useHives() {
  return useLiveQuery(() =>
    db.hives.filter((h) => !h.deleted).toArray(),
    []
  ) as LocalHive[] | undefined;
}

export function useHive(id: string) {
  return useLiveQuery(() => db.hives.get(id), [id]) as LocalHive | undefined;
}

// ─── Paginated Hives ──────────────────────────────────────────────────────────

export function useHivesPaginated(page: number, pageSize = 20) {
  return useLiveQuery(() =>
    db.hives
      .filter((h) => !h.deleted)
      .offset(page * pageSize)
      .limit(pageSize)
      .toArray(),
    [page, pageSize]
  ) as LocalHive[] | undefined;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export function useActiveAlerts() {
  return useLiveQuery(() =>
    db.alerts
      .orderBy('priority')
      .filter((a) => !a.resolved && !a.deleted)
      .toArray(),
    []
  ) as LocalAlert[] | undefined;
}

// ─── Harvests ─────────────────────────────────────────────────────────────────

export function useHarvests() {
  return useLiveQuery(() =>
    db.harvests.filter((h) => !h.deleted).reverse().toArray(),
    []
  ) as LocalHarvest[] | undefined;
}

export function useHarvestsByHive(hiveId: string) {
  return useLiveQuery(
    () => db.harvests.where('hiveId').equals(hiveId).and((h) => !h.deleted).toArray(),
    [hiveId]
  ) as LocalHarvest[] | undefined;
}

// ─── Inspections ──────────────────────────────────────────────────────────────

export function useInspectionsByHive(hiveId: string) {
  return useLiveQuery(
    () => db.inspections.where('hiveId').equals(hiveId).and((i) => !i.deleted).toArray(),
    [hiveId]
  ) as LocalInspection[] | undefined;
}

// ─── Sync Queue Stats ─────────────────────────────────────────────────────────

export function useSyncQueueStats() {
  return useLiveQuery(async () => {
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
  }, []);
}

export function useSyncQueueItems() {
  return useLiveQuery(() => db.syncQueue.orderBy('createdAt').toArray(), []);
}

// ─── Sync Logs ────────────────────────────────────────────────────────────────

export function useSyncLogs(limit = 30) {
  return useLiveQuery(() =>
    db.syncLogs.orderBy('timestamp').reverse().limit(limit).toArray(),
    [limit]
  );
}

// ─── Sync Metrics (in-memory, polled) ────────────────────────────────────────

export function useSyncMetrics() {
  const [metrics, setMetrics] = useState(getSyncMetrics());

  useEffect(() => {
    const off = onSyncEvent(() => {
      setMetrics(getSyncMetrics());
    });
    return off;
  }, []);

  return metrics;
}

// ─── Online Status ────────────────────────────────────────────────────────────

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(getOnlineStatus());

  useEffect(() => {
    const off = onSyncEvent((event: SyncEvent) => {
      if (event.type === 'online') setOnline(true);
      if (event.type === 'offline') setOnline(false);
    });
    return off;
  }, []);

  return online;
}

// ─── Sync Status (global) ─────────────────────────────────────────────────────

export function useSyncStatus(): { syncing: boolean; lastMessage: string } {
  const [status, setStatus] = useState({ syncing: false, lastMessage: '' });

  useEffect(() => {
    const off = onSyncEvent((event: SyncEvent) => {
      if (event.type === 'start') setStatus({ syncing: true, lastMessage: event.message ?? '' });
      if (event.type === 'done' || event.type === 'failed') {
        setStatus({ syncing: false, lastMessage: event.message ?? event.type });
      }
    });
    return off;
  }, []);

  return status;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useUserProfile(uid?: string) {
  return useLiveQuery(
    () => (uid ? db.users.get(uid) : undefined),
    [uid]
  );
}
