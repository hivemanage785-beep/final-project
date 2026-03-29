/**
 * Inspection Sync Handler — v2
 * Adds: merge conflict strategy for notes, audio blob upload, payload validation
 */
import { doc, setDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db as firestoreDb, storage } from '../../firebase';
import { db } from '../../db';
import { resolveInspectionConflict, resolveConflictLWW } from '../conflict';
import { validatePayload } from '../validator';
import { SyncQueueItem } from '../../db';

export async function handleInspectionSync(job: SyncQueueItem): Promise<void> {
  const { type, entityId, payload, idempotencyKey } = job;

  if (type !== 'DELETE') {
    validatePayload('inspection', payload);
  }

  const ref = doc(firestoreDb, 'inspections', entityId);

  if (type === 'DELETE') {
    const snap = await getDoc(ref);
    if (snap.exists()) await deleteDoc(ref);
    await db.inspections.delete(entityId);
    return;
  }

  let audioUrl = payload.audioUrl as string | undefined;
  const localRecord = await db.inspections.get(entityId);

  // Upload audio blob if present
  if (!audioUrl && localRecord?.audioBlob) {
    const audioStorageRef = storageRef(storage, `inspections/${entityId}/audio.webm`);
    const blob = new Blob([localRecord.audioBlob], { type: 'audio/webm' });
    await uploadBytes(audioStorageRef, blob);
    audioUrl = await getDownloadURL(audioStorageRef);
    await db.inspections.update(entityId, { audioUrl, audioBlob: undefined });
  }

  // Conflict resolution — merge strategy for notes
  if (type === 'UPDATE') {
    const remoteSnap = await getDoc(ref);
    if (remoteSnap.exists()) {
      const remoteData = remoteSnap.data();
      const remoteUpdatedAt = (remoteData.updatedAt as Timestamp)?.toMillis?.() ?? 0;

      if (remoteData.notes && remoteData.notes !== payload.notes) {
        // Apply merge strategy
        const result = resolveInspectionConflict(
          { id: entityId, updatedAt: payload.updatedAt as number, notes: payload.notes as string },
          { id: entityId, updatedAt: remoteUpdatedAt, notes: remoteData.notes as string },
        );
        // Update payload notes with merged result
        payload.notes = result.record.notes;
        payload.updatedAt = result.record.updatedAt;
      } else {
        // Fall back to LWW for all other fields
        const result = resolveConflictLWW('inspection',
          { id: entityId, updatedAt: payload.updatedAt as number },
          { id: entityId, updatedAt: remoteUpdatedAt },
        );
        if (result.winner === 'remote') {
          await db.inspections.update(entityId, { ...remoteData, updatedAt: remoteUpdatedAt, synced: true });
          return;
        }
      }
    }
  }

  const { audioBlob: _ab, deleted: _d, synced: _s, ...rest } = payload as {
    audioBlob?: ArrayBuffer; deleted?: boolean; synced?: boolean; [k: string]: unknown;
  };

  await setDoc(ref, {
    ...rest,
    timestamp: Timestamp.fromMillis(payload.timestamp as number),
    updatedAt: Timestamp.fromMillis(payload.updatedAt as number),
    audioUrl: audioUrl ?? null,
    _idempotencyKey: idempotencyKey,
  }, { merge: true });

  await db.inspections.update(entityId, { synced: true, audioUrl });
}
