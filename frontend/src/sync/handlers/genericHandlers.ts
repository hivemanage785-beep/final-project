/**
 * Generic Sync Handlers — v2
 * Harvest, Alert, User — with validation, idempotency, and soft-delete.
 */
import { doc, setDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '../../firebase';
import { db } from '../../db';
import { validatePayload } from '../validator';
import { SyncQueueItem } from '../../db';

type Entity = 'harvest' | 'alert' | 'user';

function stripLocal(payload: Record<string, unknown>) {
  const { deleted: _d, synced: _s, ...rest } = payload as {
    deleted?: boolean; synced?: boolean; [k: string]: unknown;
  };
  return rest;
}

async function genericSync(
  job: SyncQueueItem,
  collection: string,
  entity: Entity,
  localTable: { update: (id: string, changes: object) => Promise<unknown>; delete: (id: string) => Promise<void> },
  timestampFields: string[],
): Promise<void> {
  const { type, entityId, payload, idempotencyKey } = job;

  if (type !== 'DELETE') {
    validatePayload(entity, payload);
  }

  const ref = doc(firestoreDb, collection, entityId);

  if (type === 'DELETE') {
    const snap = await getDoc(ref);
    if (snap.exists()) await deleteDoc(ref);
    await localTable.delete(entityId);
    return;
  }

  const firestorePayload: Record<string, unknown> = {
    ...stripLocal(payload),
    _idempotencyKey: idempotencyKey,
  };

  for (const field of timestampFields) {
    const val = payload[field];
    if (typeof val === 'number') {
      firestorePayload[field] = Timestamp.fromMillis(val);
    }
  }

  await setDoc(ref, firestorePayload, { merge: true });
  await localTable.update(entityId, { synced: true });
}

// ─── Harvest ─────────────────────────────────────────────────────────────────

export async function handleHarvestSync(job: SyncQueueItem): Promise<void> {
  await genericSync(job, 'harvests', 'harvest', {
    update: (id, c) => db.harvests.update(id, c),
    delete: (id) => db.harvests.delete(id),
  }, ['timestamp', 'updatedAt']);
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export async function handleAlertSync(job: SyncQueueItem): Promise<void> {
  await genericSync(job, 'alerts', 'alert', {
    update: (id, c) => db.alerts.update(id, c),
    delete: (id) => db.alerts.delete(id),
  }, ['timestamp', 'updatedAt']);
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function handleUserSync(job: SyncQueueItem): Promise<void> {
  const { type, entityId, payload, idempotencyKey } = job;
  const ref = doc(firestoreDb, 'users', entityId);

  if (type === 'DELETE') {
    await deleteDoc(ref);
    await db.users.delete(entityId);
    return;
  }

  const { deleted: _d, synced: _s, ...rest } = payload as { deleted?: boolean; synced?: boolean; [k: string]: unknown };

  await setDoc(ref, {
    ...rest,
    createdAt: Timestamp.fromMillis(payload.createdAt as number),
    updatedAt: Timestamp.fromMillis(payload.updatedAt as number),
    _idempotencyKey: idempotencyKey,
  }, { merge: true });

  await db.users.update(entityId, { synced: true });
}
