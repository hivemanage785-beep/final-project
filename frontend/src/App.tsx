import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/layout/AuthScreen';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/states/ErrorBoundary';
import './styles/index.css';

// AppContent runs inside BrowserRouter so it can safely use useLocation()
// instead of the fragile window.location.pathname approach.
function AppContent() {
  const { user, loading, initializing, error, signInWithGoogle } = useAuth();
  const location = useLocation();
  const isTraceRoute = location.pathname.startsWith('/trace/');

  // 1. Initial hydration: Wait for Firebase to tell us if we have a session
  if (initializing && !isTraceRoute) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-red-800 rounded-full animate-spin mb-6" />
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">HiveOps Security</h2>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter mt-2">Restoring secure field session...</p>
      </div>
    );
  }

  // 2. Unauthenticated: Show login screen, EXCEPT for public trace routes
  if (!user && !isTraceRoute) {
    return (
      <AuthScreen
        onSignIn={signInWithGoogle}
        loading={loading}
        error={error}
      />
    );
  }

  // 3. Authenticated (or public trace route): Show main application
  return (
    <ErrorBoundary moduleName="System Shell">
      <Layout user={user} />
    </ErrorBoundary>
  );
}

// BrowserRouter wraps everything — all children always have Router context
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
