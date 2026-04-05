import { db } from './backend/src/lib/firebase.js';
import { logger } from './backend/src/utils/logger.js';

async function verifyFirebaseAdmin() {
  logger.info('[Phase 0] Verifying Firebase Admin SDK connectivity...');
  
  if (!db) {
    logger.error('[Phase 0] Firebase Admin SDK NOT initialized (db is null)');
    process.exit(1);
  }

  try {
    const testDoc = db.collection('_phase0_test').doc('connectivity');
    await testDoc.set({ 
      timestamp: new Date().toISOString(),
      status: 'verified'
    });
    
    logger.info('[Phase 0] Firebase Write SUCCESS');
    
    const snap = await testDoc.get();
    if (snap.exists && snap.data()?.status === 'verified') {
      logger.info('[Phase 0] Firebase Read SUCCESS');
      await testDoc.delete();
      logger.info('[Phase 0] Firebase Admin Verification COMPLETE');
    } else {
      throw new Error('Data mismatch or document not found');
    }
  } catch (err) {
    logger.error('[Phase 0] Firebase Admin Verification FAILED', { message: err.message });
    process.exit(1);
  }
}

verifyFirebaseAdmin();
