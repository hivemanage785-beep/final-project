import { useState, useEffect } from 'react';
import { 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase';
import { db } from '../lib/db';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let unsubscribed = false;
    let isHandlingRedirect = true;
    let authStateFired = false;

    console.log("🔐 [AUTH] Initialization started...");

    const completeInit = () => {
      if (!unsubscribed) {
        console.log("🏁 [AUTH] Initialization completed.");
        setInitializing(false);
        clearTimeout(timeoutId);
      }
    };

    // 1. FAIL-SAFE TIMEOUT
    timeoutId = setTimeout(() => {
      if (initializing && !unsubscribed) {
        console.warn("⚠️ [AUTH] Initialization timeout reached. Forcing resolution.");
        completeInit();
      }
    }, 8000);

    // 2. Handle Redirect Results
    getRedirectResult(auth)
      .then((result) => {
        if (unsubscribed) return;
        isHandlingRedirect = false;

        if (result?.user) {
          console.log("✅ [AUTH] Redirect result resolved:", result.user.email);
          setUser(result.user);
          completeInit();
        } else {
          console.log("ℹ️ [AUTH] No redirect result found.");
          if (authStateFired) completeInit();
        }
      })
      .catch(err => {
        if (unsubscribed) return;
        isHandlingRedirect = false;
        console.error("❌ [AUTH] Redirect resolution error:", err);
        setError(err.message);
        completeInit();
      });

    // 3. Primary State Authority: onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (unsubscribed) return;
      authStateFired = true;

      console.log("🔄 [AUTH] Auth state changed:", u ? u.email : "Logged Out");
      
      if (u) {
        try {
          const token = await u.getIdToken();
          localStorage.setItem('auth_token', token);
          setUser(u);
          console.log("✅ [AUTH] Session verified.");
        } catch (e) {
          console.error("❌ [AUTH] Session verification failed:", e);
          setUser(null);
          localStorage.removeItem('auth_token');
        }
      } else {
        setUser(null);
        localStorage.removeItem('auth_token');
      }
      
      if (initializing && !isHandlingRedirect) {
        completeInit();
      }
    });

    return () => {
      unsubscribed = true;
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    console.log("🚀 [AUTH] Starting Google Sign-In...");
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      try {
        const result = await signInWithPopup(auth, provider);
        console.log("✅ [AUTH] Popup login success:", result.user.email);
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
          console.warn("⚠️ [AUTH] Popup blocked/cancelled. Attempting redirect...");
          await signInWithRedirect(auth, provider);
        } else {
          throw popupError;
        }
      }
    } catch (err: any) {
      console.error("❌ [AUTH] Sign-in failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log("👋 [AUTH] Signing out...");
    try {
      localStorage.removeItem('auth_token');
      
      // CRITICAL: Clear all offline caches to prevent cross-user leakage
      const tables = [db.hives, db.harvests, db.inspections, db.savedLocations, db.alerts, db.outbox];
      await Promise.all(tables.map(table => table.clear().catch(e => console.error(`[DB] Failed to clear ${table.name}`, e))));
      console.log("✅ [AUTH] Offline caches cleared.");

      await firebaseSignOut(auth);
      console.log("✅ [AUTH] Sign-out complete.");
    } catch (err: any) {
      console.error("❌ [AUTH] Sign-out error:", err);
    }
  };

  return { user, loading, initializing, error, signInWithGoogle, signOut };
}
