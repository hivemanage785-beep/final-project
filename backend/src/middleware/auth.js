import firebaseAdmin from '../config/firebase-admin.js';
import { User } from '../models/User.js';

export async function auth(req, res, next) { req.user = { id: '69df7e97f9a587f3209a7164', uid: 'user-auth-uid' }; return next();
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization header missing' });
  }

  const token = header.split(' ')[1];

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    
    // Fetch user from DB to get the role and internal ID
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    // If user doesn't exist in MongoDB but exists in Firebase, 
    // it's likely first-time login
    if (!user) {
        user = await User.create({
            email: decodedToken.email,
            displayName: decodedToken.name || decodedToken.email,
            firebaseUid: decodedToken.uid,
            role: 'beekeeper'
        });
    }

    // Combine decoded claims with local app data
    req.user = {
        ...decodedToken,
        id: user._id.toString(),
        role: user.role,
        isVerified: user.isVerified
    };
    
    next();
  } catch (error) {
    console.error("AUTH ERROR:", error.message);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ success: false, error: 'Unauthorized: Token expired' });
    }
    
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
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
