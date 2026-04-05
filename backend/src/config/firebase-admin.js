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
     admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
     });
  } catch (e) {
     console.warn("Firebase Admin failed to initialize applicationDefault. Ensure GOOGLE_APPLICATION_CREDENTIALS is set. For testing purposes without a service account, verifyIdToken will fail.", e.message);
  }
}

export default admin;
