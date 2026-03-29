/**
 * Archive Service
 * ───────────────
 * Moves old synced records to the `archived` table to keep
 * the primary tables lean. Called on engine startup.
 * Threshold: 90 days for non-critical entities.
 */
import { db, ArchivedRecord } from '../db';

const ARCHIVE_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

type ArchivableTable = 'inspections' | 'harvests' | 'alerts';

async function archiveTable(tableName: ArchivableTable): Promise<number> {
  const cutoff = Date.now() - ARCHIVE_THRESHOLD_MS;
  let count = 0;

  // Only archive fully synced, non-deleted records older than threshold
  const candidates = await db[tableName]
    .filter((r) => r.synced && !r.deleted && r.updatedAt < cutoff)
    .toArray();

  if (candidates.length === 0) return 0;

  const archiveRecords: ArchivedRecord[] = candidates.map((r) => ({
    originalId: r.id,
    table: tableName,
    data: r as unknown as Record<string, unknown>,
    archivedAt: Date.now(),
  }));

  await db.transaction('rw', db[tableName], db.archived, async () => {
    await db.archived.bulkAdd(archiveRecords);
    await db[tableName].bulkDelete(candidates.map((r) => r.id));
  });

  count = candidates.length;
  console.info(`[Archive] Archived ${count} records from ${tableName}`);
  return count;
}

/**
 * Archive all old synced records across archivable tables.
 * Safe to call on every startup — no-ops when nothing qualifies.
 */
export async function archiveOldRecords(): Promise<void> {
  const tables: ArchivableTable[] = ['inspections', 'harvests', 'alerts'];
  let total = 0;
  for (const t of tables) {
    total += await archiveTable(t);
  }
  if (total > 0) {
    console.info(`[Archive] Total archived: ${total} records`);
  }
}

/**
 * Retrieve archived records for a given entity type.
 */
export async function getArchivedRecords(
  tableName: string,
  limit = 50,
): Promise<ArchivedRecord[]> {
  return db.archived
    .where('table').equals(tableName)
    .reverse()
    .limit(limit)
    .toArray();
}
