import { useState, useEffect } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const apiKeyValue = String(import.meta.env.VITE_FIREBASE_API_KEY || '');
  const isMockAuth = import.meta.env.DEV || apiKeyValue.includes('mock');

  useEffect(() => {
    if (isMockAuth) {
      const mockToken = localStorage.getItem('auth_token');
      if (mockToken === 'mock-dev-token-123') {
        setUser({
          uid: 'dev-user-123',
          displayName: 'Dev User',
          email: 'dev@buzz-off.local',
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bee',
        } as User);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        console.log("🔑 YOUR FIREBASE UID IS:", u.uid);
        const token = await u.getIdToken();
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isMockAuth]);

  const signInWithGoogle = async () => {
    setLoading(true);
    if (isMockAuth) {
      await new Promise(r => setTimeout(r, 800));
      const mockUser = {
        uid: 'dev-user-123',
        displayName: 'Dev User',
        email: 'dev@buzz-off.local',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bee',
      } as User;
      
      setUser(mockUser);
      localStorage.setItem('auth_token', 'mock-dev-token-123');
      setLoading(false);
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      localStorage.setItem('auth_token', token);
    } catch (error) {
      console.error("Firebase Login Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    if (isMockAuth) {
       setUser(null);
       return;
    }
    await firebaseSignOut(auth);
  };

  return { user, loading, signInWithGoogle, signOut };
}
