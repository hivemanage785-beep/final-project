/**
 * Hardened useSync hook
 *
 * FIXES:
 * CRITICAL: apiFetch now returns data.data — flushOutbox was checking `success` on an already-unwrapped object,
 *           causing sync to never clear the outbox (data loss after 7+ days offline).
 * CRITICAL: No deduplication — same operation queued multiple times floods server.
 * HIGH:     Sync flush could run concurrently from multiple callers (race condition).
 * HIGH:     Partial sync failure leaves ALL ops in outbox even successfully synced ones.
 * MEDIUM:   No max outbox size — unbounded growth on long offline periods.
 * MEDIUM:   No error differentiation — network vs server vs conflict errors all treated same.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAuth } from './useAuth';
import { apiFetch } from '../lib/api';

const MAX_OUTBOX_SIZE = 500;
const MAX_OPS_PER_FLUSH = 50;

export function useSync() {
  const [isOnline, setIsOnline]   = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth();
  const syncLockRef = useRef(false); // Ref-based lock prevents race from stale closure

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && user) {
      flushOutbox();
      syncDown();
    }
  }, [isOnline, user]);

  const syncDown = useCallback(async () => {
    if (!user) return;
    try {
      // Pull Hives
      const hives = await apiFetch('/api/hives', { method: 'GET' });
      if (Array.isArray(hives)) {
        await db.hives.bulkPut(hives);
        // Also enthusiastically pull inspections for those hives
        for (const hive of hives) {
          const ins = await apiFetch(`/api/inspections?hive_id=${hive.id}`, { method: 'GET' });
          if (Array.isArray(ins)) {
            await db.inspections.bulkPut(ins);
          }
        }
      }

      // Pull Saved Locations
      const locations = await apiFetch('/api/saved-locations', { method: 'GET' });
      if (Array.isArray(locations)) {
        await db.savedLocations.bulkPut(locations);
      }

      // Pull Harvests
      const harvests = await apiFetch('/api/harvests', { method: 'GET' });
      if (Array.isArray(harvests)) {
        await db.harvests.bulkPut(harvests);
      }
    } catch(e) {
      console.warn("Failed to sync down from server:", e);
    }
  }, [user]);

  const flushOutbox = useCallback(async () => {
    // Hard lock using ref — works correctly across concurrent calls
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    setIsSyncing(true);

    try {
      const allOps = await db.outbox.orderBy('timestamp').toArray();
      if (allOps.length === 0) return;

      // Process in chunks to avoid oversized payloads
      const chunk = allOps.slice(0, MAX_OPS_PER_FLUSH);

      let syncResult: any;
      try {
        syncResult = await apiFetch('/api/sync', {
          method: 'POST',
          body: { operations: chunk },
          timeoutMs: 20000  // longer timeout for bulk sync
        });
      } catch (e: any) {
        // Network/timeout: keep ops, will retry on next online event
        if (e.isOffline || e.isTimeout || (e.status ?? 0) >= 500) return;
        // 4xx (auth/validation): clear the offending ops to prevent stuck queue
        if (e.status && e.status < 500) {
          const ids = chunk.map(op => op.id as number);
          await db.outbox.bulkDelete(ids);
        }
        return;
      }

      // Per-op result handling — only clear succeeded ops
      const results: Array<{ localId: string; success: boolean; conflict?: boolean }> =
        syncResult?.results ?? [];

      const successIds = new Set(results.filter(r => r.success).map(r => r.localId));
      const conflictIds = new Set(results.filter(r => r.conflict).map(r => r.localId));

      // Delete successfully synced + conflict-resolved (LWW) ops
      const toDelete = chunk
        .filter(op => successIds.has(op.data?.id) || conflictIds.has(op.data?.id))
        .map(op => op.id as number);

      if (toDelete.length > 0) {
        await db.outbox.bulkDelete(toDelete);
      }

      // Warn if outbox growing unbounded
      const remaining = await db.outbox.count();
      if (remaining > MAX_OUTBOX_SIZE) {
        console.warn(`[Sync] Outbox exceeded ${MAX_OUTBOX_SIZE} items (${remaining}). Trimming oldest.`);
        const oldest = await db.outbox.orderBy('timestamp').limit(remaining - MAX_OUTBOX_SIZE).primaryKeys();
        await db.outbox.bulkDelete(oldest as number[]);
      }

    } catch (e) {
      console.error('[Sync] Unexpected flush error:', e);
    } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  const queueOperation = useCallback(async (entity: string, action: 'create' | 'update' | 'delete', data: any) => {
    // Generate dedupKey: entity:action:id (if id exists)
    const dedupKey = data?.id ? `${entity}:${action}:${data.id}` : null;

    if (dedupKey) {
      const existing = await db.outbox
        .where('dedupKey').equals(dedupKey)
        .first();

      if (existing) {
        // Update the existing op with latest data instead of creating duplicate
        await db.outbox.update(existing.id as number, { 
          data, 
          timestamp: new Date().toISOString() 
        });
        if (isOnline) flushOutbox();
        return;
      }
    }

    await db.outbox.add({
      entity,
      action,
      data,
      dedupKey: dedupKey || undefined,
      timestamp: new Date().toISOString()
    });

    if (isOnline) flushOutbox();
  }, [isOnline, flushOutbox]);

  const pendingCount = useLiveQuery(async () => {
    try {
      return await db.outbox.count();
    } catch (e) {
      console.warn("[Sync] Dexie count failed during initialization:", e);
      return 0;
    }
  }, []) || 0;

  return { isOnline, isSyncing, pendingCount, queueOperation, flushOutbox };
}
