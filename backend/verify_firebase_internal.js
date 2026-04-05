import { db, admin } from './src/lib/firebase.js';
import { logger } from './src/utils/logger.js';

async function verifyFirebaseAdmin() {
  logger.info('[Phase 0] Verifying Backend Firebase Admin...');
  
  if (admin.apps.length > 0) {
    const app = admin.app();
    logger.info(`[Phase 0] App Name: ${app.name}`);
    logger.info(`[Phase 0] Project ID: ${app.options.credential.projectId || 'Unknown'}`);
  } else {
    logger.error('[Phase 0] No admin app initialized');
    process.exit(1);
  }

  if (!db) {
    logger.error('[Phase 0] db is null');
    process.exit(1);
  }

  try {
    // Try to get a non-existent doc to test connectivity
    const snap = await db.collection('_phase0_test').doc('nonexistent').get();
    logger.info('[Phase 0] Connectivity OK (successfully checked non-existent doc)');
    logger.info('[Phase 0] Firebase Admin Verification COMPLETE');
  } catch (err) {
    logger.error('[Phase 0] Firebase Admin Verification FAILED', { message: err.message, stack: err.stack });
    process.exit(1);
  }
}

verifyFirebaseAdmin();
