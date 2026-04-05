import { User } from '../models/User.js';
import firebaseAdmin from '../config/firebase-admin.js';

/**
 * POST /api/auth/register
 * Creates a local User record after Firebase authentication.
 * The frontend handles Firebase sign-in; this just syncs the user to MongoDB.
 */
export async function register(req, res, next) {
  try {
    const { email, displayName, role, firebaseUid } = req.body;
    
    if (!email || !firebaseUid) {
      return res.status(400).json({ success: false, error: 'Email and firebaseUid required' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(200).json({ success: true, data: { id: exists._id, email: exists.email, displayName: exists.displayName, role: exists.role } });
    }
    
    const user = await User.create({ email, displayName, role: role || 'beekeeper', firebaseUid });
    
    res.status(201).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Verifies Firebase ID token and returns/creates the local user profile.
 */
export async function login(req, res, next) {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Firebase ID token required' });
    }

    // Verify with Firebase Admin
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    
    // Find or create local user
    let user = await User.findOne({ email: decoded.email });
    if (!user) {
      user = await User.create({
        email: decoded.email,
        displayName: decoded.name || decoded.email,
        firebaseUid: decoded.uid,
        role: 'beekeeper'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        firebaseUid: decoded.uid
      }
    });
  } catch (error) {
    next(error);
  }
}
