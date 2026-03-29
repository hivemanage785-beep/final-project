/**
 * Hive Sync Handler — v2
 * Adds: payload validation, idempotency metadata, LWW conflict resolution
 */
import {
  doc, setDoc, deleteDoc, getDoc, Timestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../firebase';
import { db } from '../../db';
import { resolveConflictLWW } from '../conflict';
import { validatePayload } from '../validator';
import { SyncQueueItem } from '../../db';

export async function handleHiveSync(job: SyncQueueItem): Promise<void> {
  const { type, entityId, payload, idempotencyKey } = job;

  // Security: validate payload before any write
  if (type !== 'DELETE') {
    validatePayload('hive', payload);
  }

  const ref = doc(firestoreDb, 'hives', entityId);

  if (type === 'DELETE') {
    // Confirm the doc exists before deleting, then clean up locally
    const snap = await getDoc(ref);
    if (snap.exists()) await deleteDoc(ref);
    // Permanently remove from local DB after Firestore confirms deletion
    await db.hives.delete(entityId);
    return;
  }

  // Conflict resolution on UPDATE
  if (type === 'UPDATE') {
    const remoteSnap = await getDoc(ref);
    if (remoteSnap.exists()) {
      const remoteData = remoteSnap.data();
      const remoteUpdatedAt = (remoteData.updatedAt as Timestamp)?.toMillis?.() ?? 0;
      const result = resolveConflictLWW('hive',
        { id: entityId, updatedAt: payload.updatedAt as number },
        { id: entityId, updatedAt: remoteUpdatedAt },
      );
      if (result.winner === 'remote') {
        await db.hives.update(entityId, { ...remoteData, updatedAt: remoteUpdatedAt, synced: true });
        return;
      }
    }
  }

  // Strip local-only fields
  const { locationLat, locationLng, deleted: _d, synced: _s, ...rest } = payload as {
    locationLat?: number; locationLng?: number; deleted?: boolean; synced?: boolean; [k: string]: unknown;
  };

  await setDoc(ref, {
    ...rest,
    updatedAt: Timestamp.fromMillis(payload.updatedAt as number),
    lastHarvest: payload.lastHarvest ? Timestamp.fromMillis(payload.lastHarvest as number) : null,
    location: locationLat != null && locationLng != null ? { lat: locationLat, lng: locationLng } : null,
    _idempotencyKey: idempotencyKey, // stored on Firestore doc for server-side dedup if needed
  }, { merge: true });

  await db.hives.update(entityId, { synced: true });
}
