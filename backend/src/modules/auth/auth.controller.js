import { User } from '../user/user.model.js';
import firebaseAdmin from '../../config/firebase-admin.js';

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
      console.warn("🔐 [AUTH CONTROLLER] Login failed: Missing idToken");
      return res.status(400).json({ success: false, error: 'Firebase ID token required' });
    }

    // Verify with Firebase Admin
    console.log("🔍 [AUTH CONTROLLER] Verifying login token...");
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    console.log(`✅ [AUTH CONTROLLER] Token verified. UID: ${decoded.uid}`);
    
    // Find or create local user
    let user = await User.findOne({ email: decoded.email });
    if (!user) {
      console.log(`🆕 [AUTH CONTROLLER] Creating new user record for email: ${decoded.email}`);
      user = await User.create({
        email: decoded.email,
        displayName: decoded.name || decoded.email,
        firebaseUid: decoded.uid,
        role: 'beekeeper'
      });
    } else {
      console.log(`🔍 [AUTH CONTROLLER] Found existing user: ${user.email}`);
      // Ensure firebaseUid is synced
      if (!user.firebaseUid) {
          user.firebaseUid = decoded.uid;
          await user.save();
      }
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
    console.error("❌ [AUTH CONTROLLER] Login failed:", error.message);
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    // req.user is populated by the auth middleware
    if (!req.user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
}
