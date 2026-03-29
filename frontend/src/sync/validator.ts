/**
 * Payload Validator
 * ─────────────────
 * Pre-flight validation before any Firestore write.
 * Enforces required fields and user ownership.
 */

type Entity = 'user' | 'hive' | 'inspection' | 'harvest' | 'alert';

const REQUIRED_FIELDS: Record<Entity, string[]> = {
  user:       ['id', 'displayName', 'email', 'role', 'status'],
  hive:       ['id', 'name', 'apiary', 'status', 'health', 'userId'],
  inspection: ['id', 'hiveId', 'inspectorUid', 'timestamp', 'userId'],
  harvest:    ['id', 'batchId', 'hiveId', 'quantity', 'timestamp', 'userId'],
  alert:      ['id', 'type', 'message', 'timestamp', 'priority', 'userId'],
};

/**
 * Validates that a payload has all required fields and a valid userId.
 * @throws {Error} with a descriptive message when validation fails.
 */
export function validatePayload(
  entity: Entity,
  payload: Record<string, unknown>,
  currentUserId?: string,
): void {
  const required = REQUIRED_FIELDS[entity] ?? [];

  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      throw new Error(`[Validator] ${entity}: missing required field "${field}"`);
    }
  }

  // Enforce user ownership
  if (entity !== 'user' && currentUserId) {
    const recordOwner = payload.userId as string | undefined;
    if (recordOwner && recordOwner !== currentUserId) {
      throw new Error(
        `[Validator] ${entity} ${payload.id}: ownership mismatch — ` +
        `record belongs to ${recordOwner}, current user is ${currentUserId}`
      );
    }
  }

  // Type checks
  if (typeof payload.updatedAt !== 'number') {
    throw new Error(`[Validator] ${entity}: updatedAt must be a number (epoch ms)`);
  }
}
