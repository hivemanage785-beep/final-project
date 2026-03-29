/**
 * Bootstrap / Inbound Sync Service
 * ─────────────────────────────────
 * On first login or when Dexie is empty, pull data from Firestore 
 * to seed the local database. After that, local Data is the source of truth.
 */
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import { db } from '../db';
import type { LocalHive, LocalHarvest, LocalAlert, LocalInspection, LocalUser } from '../db';

function toMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return 0;
}

/** Seeds the local Dexie DB from Firestore on first load */
export async function bootstrapFromFirestore(userId: string): Promise<void> {
  const hiveCount = await db.hives.count();
  if (hiveCount > 0) return; // Already seeded

  console.log('[Bootstrap] Seeding local DB from Firestore...');

  try {
    // ── Hives
    const hivesSnap = await getDocs(query(collection(firestoreDb, 'hives'), where('userId', '==', userId)));
    const hives: LocalHive[] = hivesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? '',
        apiary: data.apiary ?? '',
        status: data.status ?? 'active',
        health: data.health ?? 100,
        temp: data.temp ?? 35,
        humidity: data.humidity ?? 60,
        lastHarvest: data.lastHarvest ? toMs(data.lastHarvest) : undefined,
        locationLat: data.location?.lat,
        locationLng: data.location?.lng,
        userId,
        updatedAt: toMs(data.updatedAt),
        synced: true,
        deleted: false,
      };
    });
    await db.hives.bulkPut(hives);

    // ── Alerts
    const alertsSnap = await getDocs(query(collection(firestoreDb, 'alerts'), orderBy('timestamp', 'desc')));
    const alerts: LocalAlert[] = alertsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        hiveId: data.hiveId,
        type: data.type,
        message: data.message,
        timestamp: toMs(data.timestamp),
        priority: data.priority,
        resolved: data.resolved ?? false,
        userId,
        updatedAt: toMs(data.updatedAt),
        synced: true,
        deleted: false,
      };
    });
    await db.alerts.bulkPut(alerts);

    // ── Harvests
    const harvestsSnap = await getDocs(query(collection(firestoreDb, 'harvests'), orderBy('timestamp', 'desc')));
    const harvests: LocalHarvest[] = harvestsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        batchId: data.batchId ?? '',
        hiveId: data.hiveId ?? '',
        apiary: data.apiary ?? '',
        quantity: data.quantity ?? 0,
        floraType: data.floraType ?? '',
        purity: data.purity ?? 0,
        moisture: data.moisture ?? 0,
        terroir: data.terroir ?? '',
        hash: data.hash ?? '',
        timestamp: toMs(data.timestamp),
        userId,
        updatedAt: toMs(data.updatedAt),
        synced: true,
        deleted: false,
      };
    });
    await db.harvests.bulkPut(harvests);

    // ── Inspections
    const inspectionsSnap = await getDocs(query(collection(firestoreDb, 'inspections'), where('inspectorUid', '==', userId)));
    const inspections: LocalInspection[] = inspectionsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        hiveId: data.hiveId ?? '',
        inspectorUid: data.inspectorUid ?? '',
        timestamp: toMs(data.timestamp),
        queenSpotted: data.queenSpotted ?? false,
        broodFrames: data.broodFrames ?? 0,
        miteCount: data.miteCount ?? 0,
        aggression: data.aggression ?? 'low',
        notes: data.notes ?? '',
        audioUrl: data.audioUrl,
        userId,
        updatedAt: toMs(data.updatedAt),
        synced: true,
        deleted: false,
      };
    });
    await db.inspections.bulkPut(inspections);

    console.log('[Bootstrap] Local DB seeded successfully.');
  } catch (err) {
    console.error('[Bootstrap] Failed to seed local DB:', err);
  }
}

/** Save or update a user profile locally (called after auth) */
export async function bootstrapUserProfile(userData: LocalUser): Promise<void> {
  await db.users.put({ ...userData, synced: true, deleted: false });
}
