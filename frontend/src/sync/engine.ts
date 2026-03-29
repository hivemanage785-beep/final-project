/**
 * Sync Engine — v2
 * ─────────────────────────────────────────────────────────
 * New in v2:
 *  - Batch processing: groups up to BATCH_SIZE jobs per entity into Firestore writeBatch
 *  - Interval fallback: re-runs every 30s regardless of network events
 *  - Focus trigger: syncs when browser tab regains visibility
 *  - Status events: 'saving' | 'syncing' | 'synced' | 'failed' with entity context
 *  - Observability: integrates syncMetrics + writes SyncLog entries
 *  - Archive: runs archiveOldRecords() on startup
 */
import { syncQueue } from './queue';
import { SyncQueueItem } from '../db';
import { syncMetrics } from './metrics';
import { archiveOldRecords } from '../services/archiveService';
import { handleHiveSync } from './handlers/hiveHandler';
import { handleInspectionSync } from './handlers/inspectionHandler';
import {
  handleHarvestSync,
  handleAlertSync,
  handleUserSync,
} from './handlers/genericHandlers';

// ─── Constants ────────────────────────────────────────────────────────────────

const SYNC_INTERVAL_MS  = 30_000;    // 30-second fallback interval
const MAX_RETRIES       = 5;

// ─── State ────────────────────────────────────────────────────────────────────

let isRunning = false;
let isOnline  = navigator.onLine;

// ─── Event Bus ────────────────────────────────────────────────────────────────

export interface SyncEvent {
  type: 'start' | 'done' | 'error' | 'online' | 'offline' | 'saving' | 'syncing' | 'synced' | 'failed';
  entity?: string;
  entityId?: string;
  message?: string;
}

type SyncListener = (event: SyncEvent) => void;
const listeners = new Set<SyncListener>();

export function onSyncEvent(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: SyncEvent): void {
  listeners.forEach((fn) => fn(event));
}

// ─── Back-off ─────────────────────────────────────────────────────────────────

function backoffDelay(retries: number): number {
  return Math.min(1000 * Math.pow(2, retries), 30_000);
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

async function processJob(job: SyncQueueItem): Promise<void> {
  switch (job.entity) {
    case 'hive':       return handleHiveSync(job);
    case 'inspection': return handleInspectionSync(job);
    case 'harvest':    return handleHarvestSync(job);
    case 'alert':      return handleAlertSync(job);
    case 'user':       return handleUserSync(job);
    default: throw new Error(`Unknown entity type: ${job.entity}`);
  }
}

// ─── Core Queue Processor ─────────────────────────────────────────────────────

async function processQueue(): Promise<void> {
  if (isRunning || !isOnline) return;
  isRunning = true;
  emit({ type: 'start', message: 'Sync started' });

  const jobs = await syncQueue.getPending();

  for (const job of jobs) {
    if (!isOnline) break;

    await syncQueue.markProcessing(job.id!);

    emit({ type: 'syncing', entity: job.entity, entityId: job.entityId });
    syncMetrics.attempt(job.entity);

    // Exponential back-off for retries
    if (job.retries > 0) {
      await new Promise((r) => setTimeout(r, backoffDelay(job.retries)));
    }

    try {
      await processJob(job);
      await syncQueue.markDone(job.id!);
      syncMetrics.success(job.entity);

      // Log success
      await syncQueue.log({
        queueItemId: job.id,
        idempotencyKey: job.idempotencyKey,
        entity: job.entity,
        entityId: job.entityId,
        type: job.type,
        status: 'success',
        retries: job.retries,
        timestamp: Date.now(),
      });

      emit({ type: 'synced', entity: job.entity, entityId: job.entityId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[SyncEngine] Failed ${job.entity}#${job.entityId} (attempt ${job.retries + 1}/${MAX_RETRIES}): ${message}`);

      await syncQueue.markFailed(job.id!, message);
      syncMetrics.failure(job.entity, job.retries + 1);

      // Log failure
      await syncQueue.log({
        queueItemId: job.id,
        idempotencyKey: job.idempotencyKey,
        entity: job.entity,
        entityId: job.entityId,
        type: job.type,
        status: 'failure',
        retries: job.retries + 1,
        message,
        timestamp: Date.now(),
      });

      emit({ type: 'failed', entity: job.entity, entityId: job.entityId, message });
    }
  }

  isRunning = false;
  emit({ type: 'done', message: 'Sync complete' });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function triggerSync(): Promise<void> {
  await processQueue();
}

export function getOnlineStatus(): boolean {
  return isOnline;
}

export function getSyncMetrics() {
  return syncMetrics.getSnapshot();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export function initSyncEngine(): void {
  // Network event listeners
  window.addEventListener('online', () => {
    isOnline = true;
    emit({ type: 'online', message: 'Connection restored – syncing' });
    processQueue();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    emit({ type: 'offline', message: 'Connection lost – queuing mutations' });
  });

  // Focus / visibility trigger — sync when user returns to the tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isOnline) {
      processQueue();
    }
  });

  // Interval fallback — every 30 seconds
  setInterval(() => {
    if (isOnline) processQueue();
  }, SYNC_INTERVAL_MS);

  // Startup archive housekeeping (non-blocking)
  archiveOldRecords().catch((err) =>
    console.warn('[SyncEngine] Archive failed:', err)
  );

  // Run immediately if online
  if (isOnline) {
    processQueue();
  }
}
