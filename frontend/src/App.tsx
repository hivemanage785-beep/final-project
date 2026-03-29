/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Hexagon, 
  Search, 
  User as UserIcon, 
  LayoutDashboard, 
  TableProperties, 
  Map as MapIcon, 
  Bell, 
  Menu, 
  ShieldCheck, 
  ArrowLeft, 
  Mic, 
  CheckCircle2, 
  Settings, 
  ChevronRight, 
  AlertTriangle, 
  LogOut,
  Verified,
  Clock,
  Navigation,
  Activity,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { auth } from './firebase';
import { cn } from './lib/utils';

// ── Local-First imports ────────────────────────────────────────────────────
import { useHives, useActiveAlerts, useHarvests, useUserProfile } from './hooks/useLocalData';
import { userRepository } from './repositories/userRepository';
import { alertRepository } from './repositories/alertRepository';
import { bootstrapFromFirestore, bootstrapUserProfile } from './services/bootstrapService';
import { SyncDebugPanel } from './components/SyncDebugPanel';
import { GlobalSyncIndicator } from './components/SyncStatusBadge';

// --- Admin Components ---
import { AdminLayout, AdminView } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { HiveManagement } from './components/admin/HiveManagement';
import { HiveDetail } from './components/admin/HiveDetail';
import { UserManagement } from './components/admin/UserManagement';
import { HarvestTraceability } from './components/admin/HarvestTraceability';
import { AlertManagement } from './components/admin/AlertManagement';
import { Analytics } from './components/admin/Analytics';
import { SystemMonitor } from './components/admin/SystemMonitor';

// --- Beekeeper Components ---
import { BKDashboard } from './components/beekeeper/BKDashboard';
import { HiveList } from './components/beekeeper/HiveList';
import { QuickInspection } from './components/beekeeper/QuickInspection';
import { DetailedInspection } from './components/beekeeper/DetailedInspection';
import { VoiceMode } from './components/beekeeper/VoiceMode';
import { AlertPanel } from './components/beekeeper/AlertPanel';
import { MapView } from './components/beekeeper/MapView';

import { HealthBadge, EmptyState } from './components/shared';

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const profile = useUserProfile(user?.uid) ?? null;
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const localProfile = await userRepository.getById(firebaseUser.uid);
          if (!localProfile) {
            const isAdmin = firebaseUser.email === 'benitaissac0505@gmail.com' || firebaseUser.email === 'hivemanage785@gmail.com';
            const newLocalUser = {
              id: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'New Beekeeper',
              email: firebaseUser.email || '',
              role: (isAdmin ? 'admin' : 'beekeeper') as 'admin' | 'beekeeper',
              status: (isAdmin ? 'approved' : 'pending') as 'approved' | 'pending',
              hasSeenTour: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              synced: false,
              deleted: false,
            };
            await bootstrapUserProfile(newLocalUser);
            await userRepository.upsert(newLocalUser);
          }
          await bootstrapFromFirestore(firebaseUser.uid);
        } catch (error) {
          console.error('Bootstrap error:', error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen onLogin={handleLogin} isLoggingIn={isLoggingIn} />;
  if (profile?.status === 'pending') return <PendingApproval onLogout={handleLogout} />;

  return profile?.role === 'admin' 
    ? <AdminExperience user={user} profile={profile} onLogout={handleLogout} /> 
    : <BeekeeperExperience user={user} profile={profile} onLogout={handleLogout} />;

  async function handleLogin() {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
  }
}

// --- Sub-Experiences ---

function AdminExperience({ user, profile, onLogout }: { user: FirebaseUser, profile: any, onLogout: () => void }) {
  const [view, setView] = useState<AdminView>('dashboard');
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>(null);
  const [selectedHarvestId, setSelectedHarvestId] = useState<string | null>(null);

  const handleNavigate = (v: AdminView, id?: string) => {
    if (id) {
      if (v === 'hive-detail') setSelectedHiveId(id);
      if (v === 'harvest-detail') setSelectedHarvestId(id);
    }
    setView(v);
  };

  const renderContent = () => {
    switch(view) {
      case 'dashboard':     return <AdminDashboard onNavigate={handleNavigate} />;
      case 'hives':         return <HiveManagement onNavigate={handleNavigate} />;
      case 'hive-detail':   return selectedHiveId ? <HiveDetail hiveId={selectedHiveId} onBack={() => setView('hives')} /> : <HiveManagement onNavigate={handleNavigate} />;
      case 'users':         return <UserManagement />;
      case 'harvests':      return <HarvestTraceability onNavigate={handleNavigate} />;
      case 'harvest-detail': return <HarvestTraceability onNavigate={handleNavigate} selectedBatchId={selectedHarvestId ?? undefined} />;
      case 'alerts':        return <AlertManagement />;
      case 'analytics':     return <Analytics />;
      case 'system':        return <SystemMonitor />;
      default:              return <AdminDashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <AdminLayout 
      activeView={view} 
      onNavigate={setView} 
      onLogout={onLogout} 
      userName={profile?.displayName || user.displayName || 'Admin'}
    >
      {renderContent()}
      <SyncDebugPanel />
    </AdminLayout>
  );
}

function BeekeeperExperience({ user, profile, onLogout }: { user: FirebaseUser, profile: any, onLogout: () => void }) {
  const [screen, setScreen] = useState('dashboard');
  const [showInspection, setShowInspection] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>(null);

  const renderScreen = () => {
    switch(screen) {
      case 'dashboard':   return <BKDashboard userName={profile.displayName} onNavigate={(s, id) => { if (s === 'inspection') setShowInspection(true); else if (id) { setSelectedHiveId(id); setScreen('hives'); } else setScreen(s); }} />;
      case 'hives':       return <HiveList onSelect={(id) => { setSelectedHiveId(id); setScreen('detailed-hive'); }} />;
      case 'alerts':      return <AlertPanel />;
      case 'map':         return <MapView onSelectHive={(id) => { setSelectedHiveId(id); setScreen('detailed-hive'); }} />;
      case 'detailed-hive': return selectedHiveId ? <HiveDetail hiveId={selectedHiveId} onBack={() => setScreen('hives')} /> : <HiveList onSelect={(id) => { setSelectedHiveId(id); setScreen('detailed-hive'); }} />;
      case 'more':           return <MoreScreen profile={profile} user={user} onLogout={onLogout} />;
      default:            return <BKDashboard userName={profile.displayName} onNavigate={setScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-2xl">
      <header className="px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Hexagon className="w-5 h-5 fill-current" />
          </div>
          <span className="font-black text-slate-800 tracking-tighter uppercase text-sm">BUZZ-OFF</span>
        </div>
        <GlobalSyncIndicator />
      </header>

      <main className="flex-1 p-6 overflow-x-hidden">
        {renderScreen()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center pt-3 pb-8 px-4 z-40">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Today' },
          { id: 'hives', icon: TableProperties, label: 'Hives' },
          { id: 'map', icon: MapIcon, label: 'Field' },
          { id: 'alerts', icon: Bell, label: 'Alerts' },
          { id: 'more', icon: Menu, label: 'More' },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              screen === item.id ? "text-primary scale-110" : "text-slate-400"
            )}
          >
            <item.icon className={cn("w-5 h-5", screen === item.id && "fill-current")} />
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {showInspection && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 z-50">
            <QuickInspection userId={user.uid} onClose={() => setShowInspection(false)} />
          </motion.div>
        )}
        {showVoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
            <VoiceMode onClose={() => setShowVoice(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Voice Mode */}
      <button 
        onClick={() => setShowVoice(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl z-30 active:scale-95 transition-transform"
      >
        <Mic className="w-6 h-6" />
      </button>
    </div>
  );
}

// --- Atomic Screens ---

function AuthScreen({ onLogin, isLoggingIn }: { onLogin: () => void, isLoggingIn: boolean }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto shadow-2xl">
      <div className="w-24 h-24 bg-primary rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/30 mb-8 rotate-3">
        <Hexagon className="text-white w-12 h-12 fill-current" />
      </div>
      <h1 className="text-5xl font-black text-slate-800 tracking-tighter mb-2">BUZZ-OFF</h1>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-12">Heritage Apiary Management</p>
      
      <div className="w-full bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 flex flex-col items-center gap-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Beekeeper Login</h2>
          <p className="text-xs text-slate-400 font-medium">Use your heritage credentials to access your colonies.</p>
        </div>
        
        <button 
          onClick={onLogin}
          disabled={isLoggingIn}
          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
        >
          {isLoggingIn ? 'Verifying...' : 'Sign in with Google'}
          {!isLoggingIn && <Settings className="w-4 h-4 text-primary" />}
        </button>
      </div>

      <p className="mt-12 text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">Immutable Protocol v2.5</p>
    </div>
  );
}

function PendingApproval({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mb-8">
        <Clock className="w-10 h-10 animate-pulse" />
      </div>
      <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Account Pending</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-8">
        Your beekeeper profile is currently being reviewed by an lead administrator. 
        You will receive a notification once your access is verified.
      </p>
      <button onClick={onLogout} className="text-primary font-black uppercase text-xs tracking-widest">Sign Out</button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 max-w-md mx-auto">
      <motion.div 
        animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 180, 270, 360] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center"
      >
        <Hexagon className="w-8 h-8 text-primary" />
      </motion.div>
    </div>
  );
}

function MoreScreen({ profile, user, onLogout }: { profile: any, user: any, onLogout: () => void }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white border-4 border-white shadow-2xl overflow-hidden">
          {user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <UserIcon className="w-10 h-10" />}
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{profile.displayName}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-black uppercase rounded-full tracking-widest">{profile.role}</span>
            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-black uppercase rounded-full tracking-widest border border-green-100 flex items-center gap-1">
              <Verified className="w-3 h-3" /> Verified
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { icon: Settings, label: 'Preferences', color: 'text-slate-400' },
          { icon: ShieldCheck, label: 'Privacy & Security', color: 'text-slate-400' },
          { icon: Navigation, label: 'Location Sync', color: 'text-slate-400' },
          { icon: Activity, label: 'App Health', color: 'text-slate-400' },
        ].map(item => (
          <button key={item.label} className="w-full p-5 bg-white rounded-3xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <item.icon className={cn("w-5 h-5", item.color)} />
              </div>
              <span className="text-sm font-black text-slate-700">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-200" />
          </button>
        ))}
        
        <button 
          onClick={onLogout}
          className="w-full p-5 bg-red-50 text-red-600 rounded-3xl border border-red-100 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest mt-6"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
