import firebaseAdmin from '../config/firebase-admin.js';
import { User } from '../modules/user/user.model.js';

export async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    console.warn("🔐 [BACKEND AUTH] Authorization header missing or malformed");
    return res.status(401).json({ success: false, error: 'Authorization header missing' });
  }

  // Robustly extract token (handle multiple spaces or other variations)
  const token = header.substring(7).trim();
  
  if (!token) {
    console.warn("🔐 [BACKEND AUTH] Bearer token is empty");
    return res.status(401).json({ success: false, error: 'Empty token' });
  }

  try {
    // Audit: Log the start of the token for verification (concise, non-sensitive)
    const tokenPreview = `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
    console.log(`🔍 [BACKEND AUTH] Verifying token: ${tokenPreview}`);

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    console.log(`✅ [BACKEND AUTH] Token verified. UID: ${decodedToken.uid}, Email: ${decodedToken.email}`);
    
    // 1. Primary Lookup: Firebase UID
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    // 2. Secondary Lookup: Email (to handle pre-seeded or legacy accounts)
    if (!user && decodedToken.email) {
        console.log(`🔍 [BACKEND AUTH] UID ${decodedToken.uid} not found in DB. Searching by email: ${decodedToken.email}`);
        user = await User.findOne({ email: decodedToken.email });
        
        if (user) {
            console.log(`🔗 [BACKEND AUTH] Linking existing user record to new Firebase UID: ${decodedToken.uid}`);
            user.firebaseUid = decodedToken.uid;
            if (!user.displayName && decodedToken.name) user.displayName = decodedToken.name;
            await user.save();
        }
    }

    // 3. Final Creation: If still no user, create new beekeeper
    if (!user) {
        console.log(`🆕 [BACKEND AUTH] Creating new user record for UID: ${decodedToken.uid}`);
        user = await User.create({
            email: decodedToken.email,
            displayName: decodedToken.name || decodedToken.email,
            firebaseUid: decodedToken.uid,
            role: 'beekeeper'
        });
    }

    req.user = {
        id: user._id.toString(),
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: user.role
    };
    
    next();
  } catch (error) {
    console.error("❌ [BACKEND AUTH] Authentication sequence failed:", error.message);
    
    // Detailed error logging for Firebase Admin verification
    if (error.code) {
        console.error(`   - Firebase Error Code: ${error.code}`);
    }

    // Distinguish between Firebase Auth errors and DB/System errors
    if (error.code?.startsWith('auth/')) {
        const isExpired = error.code === 'auth/id-token-expired';
        return res.status(401).json({ 
            success: false, 
            error: isExpired ? 'Unauthorized: Token expired' : 'Unauthorized: Token verification failed',
            code: error.code,
            message: error.message
        });
    }
    
    // For DB errors (like E11000) or other system errors, return a 500 
    // to avoid triggering the frontend's aggressive 401 logout logic.
    res.status(500).json({ 
        success: false, 
        error: 'Internal system error during authentication',
        message: error.message 
    });
  }
}

export async function adminAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    next();
}

export const admin = adminAuth;
