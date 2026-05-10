import admin from 'firebase-admin';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!admin.apps.length) {
  try {
     const p = path.resolve(__dirname, '../../serviceAccountKey.json');
     const serviceAccount = JSON.parse(fs.readFileSync(p, 'utf-8'));
     
     console.log(`📡 [FIREBASE ADMIN] Initializing...`);
     console.log(`   - Project ID: ${serviceAccount.project_id}`);
     console.log(`   - Client Email: ${serviceAccount.client_email}`);
     
     admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id // Explicitly set it
     });
     
     console.log("✅ [FIREBASE ADMIN] Successfully initialized.");
  } catch (e) {
     console.error("❌ [FIREBASE ADMIN] Initialization failed:", e.message);
  }
}

export default admin;
