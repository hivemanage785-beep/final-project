import { useState, useEffect } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!import.meta.env.DEV);

  useEffect(() => {
    if (import.meta.env.DEV) {
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

    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (import.meta.env.DEV) {
      setLoading(true);
      await new Promise(r => setTimeout(r, 800));
      const mockUser = {
        uid: 'dev-user-123',
        displayName: 'Dev User',
        email: 'dev@buzz-off.local',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bee',
      } as User;
      
      setUser(mockUser);
      localStorage.setItem('auth_token', 'mock-dev-token-123'); // For apiFetch
      setLoading(false);
      return;
    }
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    localStorage.setItem('auth_token', token);
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    if (import.meta.env.DEV) {
       setUser(null);
       return;
    }
    await firebaseSignOut(auth);
  };


  return { user, loading, signInWithGoogle, signOut };
}
