/**
 * Conflict Resolution — v2
 * ─────────────────────────
 * Default: Last Write Wins (LWW) on updatedAt
 * Special: Inspections use a merge strategy on the `notes` field
 */

export interface ConflictRecord {
  id: string;
  updatedAt: number;
  [key: string]: unknown;
}

export interface ConflictResult<T extends ConflictRecord> {
  winner: 'local' | 'remote' | 'merged';
  record: T;
}

export interface ConflictEvent {
  entity: string;
  id: string;
  strategy: 'lww' | 'merge';
  winner: 'local' | 'remote' | 'merged';
  resolvedAt: number;
}

const conflictLog: ConflictEvent[] = [];

// ─── LWW (Last Write Wins) ────────────────────────────────────────────────────

export function resolveConflictLWW<T extends ConflictRecord>(
  entity: string,
  local: T,
  remote: T,
): ConflictResult<T> {
  const winner: 'local' | 'remote' = local.updatedAt >= remote.updatedAt ? 'local' : 'remote';

  conflictLog.push({ entity, id: local.id, strategy: 'lww', winner, resolvedAt: Date.now() });
  console.warn('[Conflict:LWW]', entity, local.id, '→', winner);

  return { winner, record: winner === 'local' ? local : remote };
}

// ─── Merge Strategy (Inspections) ─────────────────────────────────────────────

interface InspectionRecord extends ConflictRecord {
  notes: string;
}

export function resolveInspectionConflict(
  local: InspectionRecord,
  remote: InspectionRecord,
): ConflictResult<InspectionRecord> {
  const localNewer = local.updatedAt >= remote.updatedAt;

  // Merge notes — deduplicate paragraphs
  const localNotes = local.notes.trim();
  const remoteNotes = remote.notes.trim();

  let mergedNotes: string;
  if (!localNotes) {
    mergedNotes = remoteNotes;
  } else if (!remoteNotes || localNotes === remoteNotes) {
    mergedNotes = localNotes;
  } else {
    // Concatenate with separator; ensure no duplicates
    const separator = '\n---\n';
    mergedNotes = localNewer
      ? `${localNotes}${separator}[Remote: ${remoteNotes}]`
      : `${remoteNotes}${separator}[Local: ${localNotes}]`;
  }

  const base = localNewer ? local : remote;
  const merged: InspectionRecord = { ...base, notes: mergedNotes, updatedAt: Date.now() };

  conflictLog.push({
    entity: 'inspection',
    id: local.id,
    strategy: 'merge',
    winner: 'merged',
    resolvedAt: Date.now(),
  });
  console.info('[Conflict:Merge] inspection', local.id, '→ notes merged');

  return { winner: 'merged', record: merged };
}

// ─── Legacy compat — kept for external callers ────────────────────────────────

export function resolveConflict(
  entity: string,
  local: ConflictRecord,
  remote: ConflictRecord,
): 'local' | 'remote' {
  return resolveConflictLWW(entity, local, remote).winner as 'local' | 'remote';
}

export function getConflictLog(): ConflictEvent[] {
  return [...conflictLog];
}
