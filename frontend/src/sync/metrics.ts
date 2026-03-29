/**
 * Sync Metrics
 * ────────────
 * Singleton in-memory metrics store, updated by the sync engine.
 * Metrics are CUMULATIVE for the current browser session.
 */

export type MetricEntity = 'user' | 'hive' | 'inspection' | 'harvest' | 'alert' | 'unknown';

export interface EntityMetrics {
  attempts: number;
  successes: number;
  failures: number;
  maxRetries: number;
}

export interface SyncMetricsSnapshot {
  total: { attempts: number; successes: number; failures: number };
  byEntity: Record<MetricEntity, EntityMetrics>;
  lastSyncAt?: number;
  sessionStartedAt: number;
}

// ─── Internal State ───────────────────────────────────────────────────────────

const sessionStartedAt = Date.now();
let lastSyncAt: number | undefined;

const createEntityMetrics = (): EntityMetrics => ({
  attempts: 0, successes: 0, failures: 0, maxRetries: 0,
});

const byEntity: Record<MetricEntity, EntityMetrics> = {
  user:       createEntityMetrics(),
  hive:       createEntityMetrics(),
  inspection: createEntityMetrics(),
  harvest:    createEntityMetrics(),
  alert:      createEntityMetrics(),
  unknown:    createEntityMetrics(),
};

const totals = { attempts: 0, successes: 0, failures: 0 };

// ─── Public API ───────────────────────────────────────────────────────────────

function entityKey(entity: string): MetricEntity {
  return (entity in byEntity ? entity : 'unknown') as MetricEntity;
}

export const syncMetrics = {
  attempt(entity: string): void {
    const e = byEntity[entityKey(entity)];
    e.attempts++;
    totals.attempts++;
  },

  success(entity: string): void {
    const e = byEntity[entityKey(entity)];
    e.successes++;
    totals.successes++;
    lastSyncAt = Date.now();
  },

  failure(entity: string, retries: number): void {
    const e = byEntity[entityKey(entity)];
    e.failures++;
    totals.failures++;
    if (retries > e.maxRetries) e.maxRetries = retries;
  },

  getSnapshot(): SyncMetricsSnapshot {
    return {
      total: { ...totals },
      byEntity: Object.fromEntries(
        Object.entries(byEntity).map(([k, v]) => [k, { ...v }])
      ) as Record<MetricEntity, EntityMetrics>,
      lastSyncAt,
      sessionStartedAt,
    };
  },

  reset(): void {
    for (const key of Object.keys(byEntity) as MetricEntity[]) {
      byEntity[key] = createEntityMetrics();
    }
    totals.attempts = 0;
    totals.successes = 0;
    totals.failures = 0;
    lastSyncAt = undefined;
  },
};
