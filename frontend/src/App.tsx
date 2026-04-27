import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { Layout } from './components/Layout';
import './index.css';

export default function App() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  if (authLoading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-red-800 rounded-full animate-spin" />
    </div>
  );

  if (!user) return <AuthScreen onSignIn={signInWithGoogle} />;

  return (
    <BrowserRouter>
      <Layout user={user} />
    </BrowserRouter>
  );
}
