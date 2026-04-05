import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { MapView } from './components/MapView';
import { BottomNavigation, TabType } from './components/BottomNavigation';
import { Dashboard } from './pages/Dashboard';
import { HivesList } from './pages/HivesList';
import { QRTrace } from './pages/QRTrace';
import { AdminMenu } from './pages/AdminMenu';
import { TracePage } from './pages/TracePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { Alerts } from './pages/Alerts';
// We import the CSS to ensure tailwind processes
import './index.css';

export default function App() {
  // Handle public routes
  const pathParts = window.location.pathname.split('/');
  if (pathParts[1] === 'trace' && pathParts[2]) {
    return <TracePage publicId={pathParts[2]} />;
  }
  if (pathParts[1] === 'admin') {
    return <AdminDashboard />;
  }

  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  
  // Start on Dashboard (Today)
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#5D0623] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSignIn={signInWithGoogle} />;
  }

  return (
    // Phone card: max-width 420px, centered on desktop, full height on mobile
    <div className="flex flex-col h-[100dvh] bg-white w-full max-w-[420px] mx-auto relative sm:border-x sm:border-gray-200 shadow-[0_0_60px_rgba(0,0,0,0.4)]">
      {/* Content area — flex-1 so it fills space above the nav */}
      <main className="flex-1 relative w-full min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'hives' && <HivesList />}
        {activeTab === 'field' && <MapView user={user} />}
        {activeTab === 'alerts' && <Alerts />}
        {activeTab === 'more' && <AdminMenu />}
      </main>
      
      {/* Nav is flex-shrink-0 — stays at bottom, no fixed/absolute needed */}
      <BottomNavigation activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}
