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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let unsubscribed = false;

    console.log("🔐 [AUTH] Initialization started...");

    // 1. FAIL-SAFE TIMEOUT: Ensure initialization ALWAYS resolves
    timeoutId = setTimeout(() => {
      if (initializing && !unsubscribed) {
        console.warn("⚠️ [AUTH] Initialization timeout reached. Forcing resolution.");
        setInitializing(false);
      }
    }, 5000); // 5 second fail-safe

    // 2. Handle Redirect Results (Non-blocking)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("✅ [AUTH] Redirect result resolved:", result.user.email);
          setUser(result.user);
        } else {
          console.log("ℹ️ [AUTH] No redirect result found.");
        }
      })
      .catch(err => {
        console.error("❌ [AUTH] Redirect resolution error:", err);
        setError(err.message);
      });

    // 3. Primary State Authority: onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (unsubscribed) return;

      console.log("🔄 [AUTH] Auth state changed:", u ? u.email : "Logged Out");
      setUser(u);
      
      if (u) {
        try {
          const token = await u.getIdToken();
          localStorage.setItem('auth_token', token);
          console.log("✅ [AUTH] Token restored.");
        } catch (e) {
          console.error("❌ [AUTH] Token restoration failed:", e);
        }
      } else {
        localStorage.removeItem('auth_token');
      }
      
      // Completion signal
      if (initializing) {
        console.log("🏁 [AUTH] Initialization completed via onAuthStateChanged.");
        setInitializing(false);
        clearTimeout(timeoutId);
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
      await firebaseSignOut(auth);
      console.log("✅ [AUTH] Sign-out complete.");
    } catch (err: any) {
      console.error("❌ [AUTH] Sign-out error:", err);
    }
  };

  return { user, loading, initializing, error, signInWithGoogle, signOut };
}
