import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { MapView } from './components/MapView';
import { BottomNavigation, TabType } from './components/BottomNavigation';
import { Dashboard } from './pages/Dashboard';
import { HivesList } from './pages/HivesList';
import { ProfileMenu } from './pages/ProfileMenu';
import { TracePage } from './pages/TracePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { Alerts } from './pages/Alerts';
import './index.css';

export default function App() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // 1. Handle public routes (no auth needed)
  const pathParts = window.location.pathname.split('/');
  if (pathParts[1] === 'trace' && pathParts[2]) {
    return <TracePage publicId={pathParts[2]} />;
  }

  // 2. Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#5D0623] border-t-transparent" />
      </div>
    );
  }

  // 3. Unauthenticated state
  if (!user) {
    return <AuthScreen onSignIn={signInWithGoogle} />;
  }

  // 4. Role-based Route Protection for /admin
  if (pathParts[1] === 'admin') {
    // If not admin, redirect or show error (in a real app we'd use a router, here we just check role)
    if ((user as any).role === 'admin' || (user as any).email?.endsWith('@buzz-off.io')) {
       return <AdminDashboard />;
    } else {
       return (
         <div className="min-h-screen flex items-center justify-center bg-red-50 p-6 text-center">
           <div className="max-w-md">
             <h1 className="text-2xl font-bold text-red-700 mb-2">Access Denied</h1>
             <p className="text-red-600 mb-4">Admin privileges are required to view this dashboard.</p>
             <button onClick={() => window.location.href = '/'} className="bg-red-700 text-white px-6 py-2 rounded-lg font-bold">
               Return Home
             </button>
           </div>
         </div>
       );
    }
  }

  // 5. Main App Shell (Authenticated)
  return (
    <div className="flex flex-col h-[100dvh] bg-white w-full mx-auto relative sm:border-x sm:border-gray-200 shadow-[0_0_60px_rgba(0,0,0,0.4)] sm:max-w-[480px]">
      <main className="flex-1 relative w-full min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'hives' && <HivesList />}
        {activeTab === 'field' && <MapView user={user} />}
        {activeTab === 'alerts' && <Alerts />}
        {activeTab === 'more' && <ProfileMenu />}
      </main>
      
      <BottomNavigation activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}
