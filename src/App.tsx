/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Hexagon, 
  Search, 
  User as UserIcon, 
  LayoutDashboard, 
  TableProperties, 
  Map as MapIcon, 
  Bell, 
  Menu, 
  PlusCircle, 
  Edit3, 
  FileText, 
  FlaskConical, 
  ShieldCheck, 
  ArrowLeft, 
  Mic, 
  CheckCircle2, 
  History, 
  Settings, 
  ChevronRight, 
  AlertTriangle, 
  Sun, 
  CloudSun, 
  Wind, 
  Droplets,
  LogOut,
  Fingerprint,
  Filter,
  Layers,
  Navigation,
  Plus,
  Minus,
  Copy,
  Verified,
  Clock,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  Timestamp,
  addDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { format } from 'date-fns';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { cn } from './lib/utils';

// --- Types ---
type Screen = 'auth' | 'dashboard' | 'hives' | 'inspection' | 'traceability' | 'pending' | 'map' | 'alerts' | 'more';

interface HiveData {
  id: string;
  name: string;
  apiary: string;
  status: 'active' | 'harvested' | 'relocated';
  health: number;
  temp: number;
  humidity: number;
  lastHarvest?: Timestamp;
  location?: { lat: number; lng: number };
}

interface AlertData {
  id: string;
  type: 'temp_spike' | 'treatment_due' | 'low_battery';
  message: string;
  timestamp: Timestamp;
  priority: 'high' | 'medium' | 'low';
  resolved: boolean;
  hiveId?: string;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'beekeeper';
  status: 'pending' | 'approved';
  hasSeenTour?: boolean;
  createdAt: Timestamp;
}

// --- Components ---

const HeritageStamp = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-3 p-4 bg-surface-container-highest/30 rounded-lg border-l-4 border-primary/20", className)}>
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
      <ShieldCheck className="text-primary w-6 h-6" />
    </div>
    <div>
      <p className="text-xs font-bold text-primary uppercase tracking-widest">Heritage Verified</p>
      <p className="text-[10px] text-on-surface-variant leading-tight">Biometric sensor data syncing with audio record for immutable audit trail.</p>
    </div>
  </div>
);

const BottomNav = ({ active, onNavigate }: { active: Screen, onNavigate: (s: Screen) => void }) => {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'hives', icon: TableProperties, label: 'Hives' },
    { id: 'map', icon: MapIcon, label: 'Map' },
    { id: 'alerts', icon: Bell, label: 'Alerts' },
    { id: 'more', icon: Menu, label: 'More' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pt-3 pb-8 px-4 bg-white border-t border-outline-variant/20 shadow-[0_-4px_12px_rgba(93,6,35,0.04)] md:hidden">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id as Screen)}
          className={cn(
            "flex flex-col items-center justify-center transition-all",
            active === item.id ? "text-primary scale-110" : "text-on-surface-variant hover:text-primary"
          )}
        >
          <item.icon className={cn("w-6 h-6", active === item.id && "fill-current")} />
          <span className="text-[10px] font-medium uppercase tracking-wider mt-1">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

const TopBar = ({ user, onLogout }: { user: FirebaseUser | null, onLogout: () => void }) => (
  <header className="flex items-center justify-between px-6 py-4 w-full bg-white border-b border-outline-variant/20 sticky top-0 z-50">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
        <Hexagon className="text-white w-5 h-5" />
      </div>
      <span className="font-bold text-lg tracking-tighter text-primary">BUZZ-OFF</span>
    </div>
    <div className="flex items-center gap-4">
      <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors">
        <Search className="w-5 h-5" />
      </button>
      {user ? (
        <button onClick={onLogout} className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20">
          <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full object-cover" />
        </button>
      ) : (
        <UserIcon className="w-8 h-8 p-1.5 text-on-surface-variant bg-surface-container-low rounded-full" />
      )}
    </div>
  </header>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [screen, setScreen] = useState<Screen>('auth');
  const [hives, setHives] = useState<HiveData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [harvests, setHarvests] = useState<any[]>([]);
  const [selectedHive, setSelectedHive] = useState<HiveData | null>(null);
  const [selectedHarvest, setSelectedHarvest] = useState<any | null>(null);
  const [hiveFilter, setHiveFilter] = useState<'All Hives' | 'Active' | 'Harvested' | 'Relocated'>('All Hives');
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- Firebase Auth & Profile ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileRef = doc(db, 'users', firebaseUser.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const data = profileSnap.data() as UserProfile;
            setProfile(data);
            if (data.status === 'approved') {
              setScreen('dashboard');
            } else {
              setScreen('pending');
            }
          } else {
            // Create new profile
            const isAdmin = firebaseUser.email === 'benitaissac0505@gmail.com' || firebaseUser.email === 'hivemanage785@gmail.com';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'New Beekeeper',
              email: firebaseUser.email || '',
              role: isAdmin ? 'admin' : 'beekeeper',
              status: isAdmin ? 'approved' : 'pending',
              hasSeenTour: false,
              createdAt: Timestamp.now()
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
            if (isAdmin) {
              setScreen('dashboard');
            } else {
              setScreen('pending');
            }
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setScreen('auth');
        setProfile(null);
      }
      setLoading(false);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase connection error: Client is offline.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    if (profile?.status === 'approved') {
      const hivesQuery = query(collection(db, 'hives'), orderBy('id'));
      const unsubscribeHives = onSnapshot(hivesQuery, (snapshot) => {
        setHives(snapshot.docs.map(doc => ({ ...doc.data() } as HiveData)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'hives'));

      const alertsQuery = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(10));
      const unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
        setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlertData)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'alerts'));

      const harvestsQuery = query(collection(db, 'harvests'), orderBy('timestamp', 'desc'));
      const unsubscribeHarvests = onSnapshot(harvestsQuery, (snapshot) => {
        setHarvests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'harvests'));

      return () => {
        unsubscribeHives();
        unsubscribeAlerts();
        unsubscribeHarvests();
      };
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.status === 'approved' && profile?.hasSeenTour === false) {
      setShowTour(true);
    }
  }, [profile]);

  const handleSkipTour = async () => {
    if (!user) return;
    setShowTour(false);
    try {
      await setDoc(doc(db, 'users', user.uid), { hasSeenTour: true }, { merge: true });
      setProfile(prev => prev ? { ...prev, hasSeenTour: true } : null);
    } catch (error) {
      console.error("Error updating tour status:", error);
    }
  };

  const tourSteps = [
    {
      title: "Welcome to BUZZ-OFF",
      content: "Let's take a quick look at how to manage your heritage apiary with digital precision.",
      icon: <Hexagon className="w-12 h-12 text-primary" />
    },
    {
      title: "Dashboard Overview",
      content: "Monitor active hives, honey yield, and priority alerts at a glance from your command center.",
      icon: <LayoutDashboard className="w-12 h-12 text-primary" />
    },
    {
      title: "Colony Management",
      content: "Track health, temperature, and status for all your hives in real-time.",
      icon: <TableProperties className="w-12 h-12 text-primary" />
    },
    {
      title: "Voice Inspections",
      content: "Log your hive visits hands-free using our voice-assisted mode. Perfect for working in the field.",
      icon: <Mic className="w-12 h-12 text-primary" />
    },
    {
      title: "Immutable Traceability",
      content: "Every batch of honey is digitally sealed. View origin, purity, and certification hashes.",
      icon: <Fingerprint className="w-12 h-12 text-primary" />
    }
  ];

  const handleNextTourStep = () => {
    if (tourStep < tourSteps.length - 1) {
      setTourStep(prev => prev + 1);
    } else {
      handleSkipTour();
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.log("Login popup request was cancelled by a newer request.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log("Login popup was closed by the user.");
      } else {
        console.error("Login failed:", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setScreen('auth');
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await setDoc(doc(db, 'alerts', alertId), { resolved: true }, { merge: true });
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-heritage"
        >
          <Hexagon className="text-white w-10 h-10" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-x-hidden">
      {screen !== 'auth' && <TopBar user={user} onLogout={handleLogout} />}
      
      <main className="flex-grow pb-24">
        <AnimatePresence mode="wait">
          {screen === 'auth' && (
            <motion.section 
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 flex flex-col items-center justify-center min-h-[80vh] text-center"
            >
              <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-heritage mb-8">
                <Hexagon className="text-white w-12 h-12" />
              </div>
              <h1 className="text-4xl font-black text-primary tracking-tighter mb-2">BUZZ-OFF</h1>
              <p className="text-on-surface-variant mb-12 max-w-[280px]">Heritage Apiary Management System. Artisanal care, digital precision.</p>
              
              <div className="w-full space-y-4">
                <div className="clay-card p-8 space-y-6">
                  <div className="text-left">
                    <h2 className="text-2xl font-bold text-on-surface mb-1">Welcome back</h2>
                    <p className="text-sm text-on-surface-variant">Enter your registered mobile number to access your apiary dashboard.</p>
                  </div>
                  
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Phone Number</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono text-sm">+1</span>
                      <input 
                        type="tel" 
                        placeholder="(555) 000-0000" 
                        className="input-field pl-12"
                      />
                    </div>
                  </div>
                  
                  <button onClick={() => setScreen('dashboard')} className="btn-primary w-full">
                    Send Verification Code
                  </button>
                </div>
                
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/20"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-on-surface-variant font-bold">Or continue with</span></div>
                </div>

                <button 
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 py-4 bg-white border border-outline-variant/20 rounded-lg font-bold text-on-surface transition-all",
                    isLoggingIn ? "opacity-50 cursor-not-allowed" : "hover:bg-surface-container-low"
                  )}
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
                </button>
              </div>
            </motion.section>
          )}

          {screen === 'pending' && (
            <motion.section 
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 flex flex-col items-center justify-center min-h-[70vh] text-center"
            >
              <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-8">
                <Clock className="text-primary w-10 h-10 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-on-surface mb-2">Account under review</h2>
              <p className="text-on-surface-variant mb-8">Your account is pending admin approval. You will be notified via SMS once your access has been granted.</p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full text-[10px] font-bold text-primary uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                Status: Pending Verification
              </div>
            </motion.section>
          )}

          {screen === 'dashboard' && (
            <motion.section 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 space-y-8"
            >
              <header>
                <h1 className="text-3xl font-bold text-on-surface">Good morning, {profile?.displayName.split(' ')[0] || 'Beekeeper'}</h1>
                <p className="text-on-surface-variant font-mono text-xs uppercase tracking-widest mt-1">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>
              </header>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white border-l-4 border-primary p-5 rounded-lg shadow-heritage flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Active Hives</p>
                    <span className="text-3xl font-black font-mono text-primary">{hives.filter(h => h.status === 'active').length}</span>
                  </div>
                  <span className="text-[10px] font-medium text-on-surface-variant">Total: {hives.length}</span>
                </div>
                <div className="bg-white border-l-4 border-primary p-5 rounded-lg shadow-heritage flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Honey Yield</p>
                    <span className="text-3xl font-black font-mono text-primary">
                      {harvests.reduce((acc, curr) => acc + (curr.quantity || 0), 0).toFixed(1)}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-on-surface-variant">kg total</span>
                </div>
              </div>

              <section className="clay-card overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center">
                  <h3 className="font-bold text-on-surface">Priority Alerts</h3>
                  {alerts.filter(a => !a.resolved).length > 0 && (
                    <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {alerts.filter(a => !a.resolved).length} NEW
                    </span>
                  )}
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {alerts.filter(a => !a.resolved).length > 0 ? alerts.filter(a => !a.resolved).map(alert => (
                    <div key={alert.id} className="p-4 flex gap-4 items-start hover:bg-surface-container-low transition-colors">
                      <div className={cn("mt-1", alert.priority === 'high' ? "text-primary" : "text-on-surface-variant")}>
                        {alert.type === 'temp_spike' ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-bold text-sm text-on-surface">{alert.message}</h4>
                          <span className="text-[10px] font-mono text-on-surface-variant">{format(alert.timestamp.toDate(), 'HH:mm')}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1">Hive {alert.hiveId || 'N/A'}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-on-surface-variant text-sm italic">No active alerts</div>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setScreen('hives')} className="clay-card p-6 flex flex-col items-center gap-2 hover:bg-surface-container-low transition-all">
                  <PlusCircle className="text-primary w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">New Hive</span>
                </button>
                <button onClick={() => setScreen('inspection')} className="clay-card p-6 flex flex-col items-center gap-2 hover:bg-surface-container-low transition-all">
                  <Edit3 className="text-primary w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Log Visit</span>
                </button>
              </div>

              <HeritageStamp />
            </motion.section>
          )}

          {screen === 'hives' && (
            <motion.section 
              key="hives"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 space-y-6"
            >
              <div className="flex justify-between items-end">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Apiary Overview</p>
                  <h2 className="text-3xl font-black text-primary tracking-tighter">Active Colonies</h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-on-surface-variant/60 block">TOTAL HIVES</span>
                  <span className="text-2xl font-mono font-bold text-primary">{hives.length}</span>
                </div>
              </div>

              <div className="flex gap-2 border-b border-outline-variant/20 overflow-x-auto no-scrollbar pb-1">
                {['All Hives', 'Active', 'Harvested', 'Relocated'].map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setHiveFilter(tab as any)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2",
                      hiveFilter === tab ? "text-primary border-primary" : "text-on-surface-variant border-transparent"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {hives
                  .filter(h => {
                    if (hiveFilter === 'All Hives') return true;
                    return h.status.toLowerCase() === hiveFilter.toLowerCase();
                  })
                  .length > 0 ? hives
                  .filter(h => {
                    if (hiveFilter === 'All Hives') return true;
                    return h.status.toLowerCase() === hiveFilter.toLowerCase();
                  })
                  .map((hive) => (
                  <div 
                    key={hive.id} 
                    onClick={() => {
                      setSelectedHive(hive);
                      const latestHarvest = harvests.find(h => h.hiveId === hive.id);
                      setSelectedHarvest(latestHarvest || null);
                      setScreen('traceability');
                    }} 
                    className="clay-card p-5 flex flex-col gap-4 group cursor-pointer hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-tighter">ID: {hive.id}</span>
                        <h3 className="text-xl font-bold text-on-surface leading-tight">{hive.name}</h3>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                        hive.status === 'active' ? "bg-green-100 text-green-700" : 
                        hive.status === 'harvested' ? "bg-primary/10 text-primary" : "bg-yellow-100 text-yellow-700"
                      )}>
                        {hive.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" className="stroke-surface-container-highest" strokeWidth="3" />
                          <circle 
                            cx="18" cy="18" r="16" fill="none" 
                            className="stroke-primary" 
                            strokeWidth="3" 
                            strokeDasharray={`${hive.health}, 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-xs font-bold text-primary">{hive.health}%</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-on-surface-variant">
                          <span>Colony Health</span>
                          <span className="text-primary">{hive.health > 80 ? 'Stable' : hive.health > 40 ? 'Moderate' : 'Critical'}</span>
                        </div>
                        <div className="flex justify-between text-[10px] uppercase font-bold text-on-surface-variant">
                          <span>Temp</span>
                          <span className="text-primary font-mono">{hive.temp}°C</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-outline-variant/10 flex justify-end">
                      <button className="text-primary text-xs font-bold flex items-center gap-1 group-hover:underline">
                        View Details <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="clay-card p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto">
                      <Hexagon className="text-on-surface-variant w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-on-surface">No Hives Found</h3>
                    <p className="text-sm text-on-surface-variant">There are no hives matching your current filter.</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {screen === 'inspection' && (
            <motion.section 
              key="inspection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setScreen('dashboard')} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6 text-primary" />
                </button>
                <div>
                  <h2 className="text-3xl font-black text-primary tracking-tight">Hive Inspection</h2>
                  <p className="text-on-surface-variant font-medium text-sm">
                    Recording for <span className="text-primary font-bold">{selectedHive ? `${selectedHive.apiary} • ${selectedHive.name}` : 'Select a hive'}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-8 border-b border-outline-variant/20">
                <button 
                  onClick={() => setIsManualEntry(false)}
                  className={cn(
                    "pb-3 text-xs font-bold tracking-widest uppercase transition-all border-b-2",
                    !isManualEntry ? "text-primary border-primary" : "text-on-surface-variant border-transparent"
                  )}
                >
                  Voice Mode
                </button>
                <button 
                  onClick={() => setIsManualEntry(true)}
                  className={cn(
                    "pb-3 text-xs font-bold tracking-widest uppercase transition-all border-b-2",
                    isManualEntry ? "text-primary border-primary" : "text-on-surface-variant border-transparent"
                  )}
                >
                  Manual Entry
                </button>
              </div>

              {!isManualEntry ? (
                <>
                  <div className="clay-card p-12 flex flex-col items-center justify-center min-h-[300px] text-center">
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Tap to record</p>
                    <p className="text-[10px] text-on-surface-variant/60 mb-12">"Queen spotted, brood pattern solid, no mites seen"</p>
                    
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20"
                    >
                      <Mic className="w-10 h-10" />
                    </motion.button>
                    
                    <div className="flex items-center gap-1 mt-12 h-8">
                      {[4, 8, 12, 10, 6, 3].map((h, i) => (
                        <motion.div 
                          key={i}
                          animate={{ height: [h*2, h*4, h*2] }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                          className="w-1 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Live Transcript</h3>
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    </div>
                    <div className="font-mono text-xs text-primary leading-relaxed space-y-2">
                      <p className="italic opacity-60">Waiting for voice input...</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="clay-card p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Health Score</label>
                      <input type="number" placeholder="0-100" className="input-field" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Temperature (°C)</label>
                      <input type="number" placeholder="35.0" className="input-field" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Observation Notes</label>
                    <textarea 
                      placeholder="Describe colony behavior, queen presence, brood pattern..." 
                      className="input-field min-h-[120px] py-4 resize-none"
                    ></textarea>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Checklist</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        'Queen Spotted',
                        'Healthy Brood Pattern',
                        'No Mites Detected',
                        'Sufficient Honey Stores',
                        'Active Foraging'
                      ].map((item, i) => (
                        <label key={i} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                          <input type="checkbox" className="w-4 h-4 accent-primary" />
                          <span className="text-sm font-medium text-on-surface">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => setScreen('traceability')} className="btn-primary w-full">Complete Inspection</button>
            </motion.section>
          )}

          {screen === 'traceability' && (
            <motion.section 
              key="traceability"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setScreen('hives')} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6 text-primary" />
                </button>
                <h2 className="text-2xl font-black text-primary tracking-tight">Batch Traceability</h2>
              </div>

              {selectedHarvest ? (
                <>
                  <div className="clay-card overflow-hidden">
                    <div className="h-48 w-full bg-surface-container relative">
                      <img 
                        src="https://images.unsplash.com/photo-1587049633562-ad3552a39c5e?auto=format&fit=crop&q=80&w=800" 
                        alt="Honey" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-primary/20">
                        <Verified className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Verified Batch</span>
                      </div>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h1 className="text-2xl font-black text-primary tracking-tight">{selectedHarvest.floraType || 'Wildflower Honey'}</h1>
                          <p className="text-on-surface-variant text-xs font-medium">Batch ID: {selectedHarvest.batchId}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Harvest Date</span>
                          <p className="text-primary font-mono font-bold text-sm">
                            {selectedHarvest.timestamp ? format(selectedHarvest.timestamp.toDate(), 'dd MMM yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 py-4 border-y border-outline-variant/10">
                        <div className="text-center">
                          <p className="text-[8px] uppercase tracking-widest text-on-surface-variant mb-1">Purity</p>
                          <p className="text-sm font-bold text-primary">{selectedHarvest.purity || 100}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] uppercase tracking-widest text-on-surface-variant mb-1">Moisture</p>
                          <p className="text-sm font-bold text-primary">{selectedHarvest.moisture || '17.2'}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] uppercase tracking-widest text-on-surface-variant mb-1">Terroir</p>
                          <p className="text-sm font-bold text-primary">{selectedHarvest.terroir || 'Local'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Apiary Origin</h2>
                      <span className="text-xs font-medium text-primary">{selectedHarvest.apiary || 'Main Apiary'}</span>
                    </div>
                    <div className="h-48 w-full rounded-xl bg-surface-container relative overflow-hidden">
                      <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                        <Navigation className="w-12 h-12 text-primary/20" />
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg flex items-center gap-3 border border-outline-variant/20">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <MapIcon className="text-primary w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary">{selectedHarvest.apiary || 'Heritage Apiary'}</p>
                          <p className="text-[10px] text-on-surface-variant font-mono">Source Hive: {selectedHarvest.hiveId}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <Fingerprint className="text-white w-5 h-5" />
                      </div>
                      <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Immutable Traceability</h3>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      This batch has been digitally sealed on the apiary ledger. Each jar's journey is recorded from extraction to sealing.
                    </p>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Certification Hash</span>
                      <div className="bg-surface-container-highest/30 p-4 rounded-lg flex items-center justify-between group">
                        <code className="text-on-surface font-mono text-[10px] break-all leading-tight pr-4">
                          {selectedHarvest.hash || '0x7b2038...E5D5D8A69092B0C3DBC0'}
                        </code>
                        <Copy className="text-primary w-4 h-4 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="clay-card p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto">
                    <FileText className="text-on-surface-variant w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-on-surface">No Harvest Data</h3>
                  <p className="text-sm text-on-surface-variant">There are no recorded honey harvests for this colony yet.</p>
                  <button onClick={() => setScreen('hives')} className="btn-secondary w-full">Back to Hives</button>
                </div>
              )}

              <button onClick={() => setScreen('dashboard')} className="btn-secondary w-full">Done</button>
            </motion.section>
          )}

          {screen === 'map' && (
            <motion.section 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-primary tracking-tight">Apiary Map</h2>
                <div className="flex gap-2">
                  <button className="p-2 bg-white rounded-lg border border-outline-variant/20 shadow-sm">
                    <Filter className="w-5 h-5 text-on-surface-variant" />
                  </button>
                </div>
              </div>

              <div className="clay-card h-[60vh] relative overflow-hidden bg-surface-container-low">
                {/* Mock Map View */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #5D0623 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                </div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {hives.map((hive, i) => (
                      <motion.div
                        key={hive.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="absolute cursor-pointer group"
                        style={{ 
                          left: `${20 + (i * 15) % 60}%`, 
                          top: `${20 + (i * 20) % 60}%` 
                        }}
                        onClick={() => {
                          setSelectedHive(hive);
                          setScreen('hives');
                        }}
                      >
                        <div className="relative">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-125",
                            hive.status === 'active' ? "bg-green-500" : "bg-primary"
                          )}>
                            <Hexagon className="w-4 h-4 text-white fill-current" />
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            <div className="bg-white px-2 py-1 rounded border border-outline-variant/20 shadow-xl">
                              <p className="text-[10px] font-bold text-primary">{hive.name}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-outline-variant/20 shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Navigation className="text-primary w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-primary">Heritage Apiary Main</h3>
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">37.7749° N, 122.4194° W</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="clay-card p-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-bold text-on-surface">Active Colonies</span>
                </div>
                <div className="clay-card p-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span className="text-xs font-bold text-on-surface">Harvest Ready</span>
                </div>
              </div>
            </motion.section>
          )}

          {screen === 'alerts' && (
            <motion.section 
              key="alerts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-primary tracking-tight">Alert Center</h2>
                <div className="bg-primary/10 px-3 py-1 rounded-full">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                    {alerts.filter(a => !a.resolved).length} Unresolved
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {alerts.length > 0 ? (
                  <div className="clay-card divide-y divide-outline-variant/10 overflow-hidden">
                    {alerts.sort((a, b) => {
                      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
                      return b.timestamp.toMillis() - a.timestamp.toMillis();
                    }).map((alert) => (
                      <div key={alert.id} className={cn(
                        "p-5 flex gap-4 items-start transition-colors",
                        alert.resolved ? "opacity-60 bg-surface-container-lowest" : "hover:bg-surface-container-low"
                      )}>
                        <div className={cn(
                          "p-2 rounded-xl",
                          alert.priority === 'high' ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant"
                        )}>
                          {alert.type === 'temp_spike' ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <h3 className="text-sm font-bold text-on-surface">{alert.message}</h3>
                            <span className="text-[10px] font-mono text-on-surface-variant">
                              {format(alert.timestamp.toDate(), 'HH:mm')}
                            </span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">
                            Hive: {alert.hiveId} • {format(alert.timestamp.toDate(), 'dd MMM yyyy')}
                          </p>
                          {!alert.resolved && (
                            <button 
                              onClick={() => resolveAlert(alert.id)}
                              className="mt-3 text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                            >
                              Mark as Resolved <CheckCircle2 className="w-3 h-3" />
                            </button>
                          )}
                          {alert.resolved && (
                            <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-widest">
                              Resolved <ShieldCheck className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="clay-card p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto">
                      <Bell className="text-on-surface-variant w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-on-surface">All Clear</h3>
                    <p className="text-sm text-on-surface-variant">No alerts detected in your apiary at this time.</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {screen === 'more' && (
            <motion.section 
              key="more"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 space-y-8"
            >
              <div className="flex flex-col items-center text-center space-y-4 pt-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-12 h-12 text-primary" />
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-xl shadow-lg border border-outline-variant/20">
                    <Edit3 className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-primary tracking-tight">{profile?.displayName || user?.displayName}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded-full tracking-widest">
                      {profile?.role || 'Beekeeper'}
                    </span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-widest flex items-center gap-1">
                      <Verified className="w-3 h-3" /> Verified
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] ml-2">Account Settings</h3>
                  <div className="clay-card overflow-hidden">
                    {[
                      { icon: UserIcon, label: 'Personal Information', color: 'text-primary' },
                      { icon: ShieldCheck, label: 'Security & Privacy', color: 'text-primary' },
                      { icon: Bell, label: 'Notification Preferences', color: 'text-primary' },
                    ].map((item, i) => (
                      <button key={i} className="w-full p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-0">
                        <div className="flex items-center gap-4">
                          <item.icon className={cn("w-5 h-5", item.color)} />
                          <span className="text-sm font-bold text-on-surface">{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] ml-2">App Preferences</h3>
                  <div className="clay-card overflow-hidden">
                    {[
                      { icon: Layers, label: 'Data Management', color: 'text-on-surface-variant' },
                      { icon: Navigation, label: 'Location Services', color: 'text-on-surface-variant' },
                      { icon: Settings, label: 'Advanced Settings', color: 'text-on-surface-variant' },
                    ].map((item, i) => (
                      <button key={i} className="w-full p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-0">
                        <div className="flex items-center gap-4">
                          <item.icon className={cn("w-5 h-5", item.color)} />
                          <span className="text-sm font-bold text-on-surface">{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="w-full p-4 clay-card flex items-center justify-center gap-3 text-primary hover:bg-primary/5 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-widest">Sign Out</span>
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showTour && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="clay-card max-w-sm w-full p-8 space-y-8 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-surface-container">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${((tourStep + 1) / tourSteps.length) * 100}%` }}
                />
              </div>

              <div className="flex justify-center">
                <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center">
                  {tourSteps[tourStep].icon}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-primary tracking-tight">
                  {tourSteps[tourStep].title}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {tourSteps[tourStep].content}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleNextTourStep}
                  className="btn-primary w-full"
                >
                  {tourStep === tourSteps.length - 1 ? "Get Started" : "Next"}
                </button>
                <button 
                  onClick={handleSkipTour}
                  className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
                >
                  Skip Tour
                </button>
              </div>

              <div className="flex justify-center gap-1.5">
                {tourSteps.map((_, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      i === tourStep ? "bg-primary w-4" : "bg-outline-variant/40"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {screen !== 'auth' && screen !== 'pending' && <BottomNav active={screen} onNavigate={setScreen} />}
      
      <footer className="py-8 text-center px-6 opacity-40">
        <p className="text-[8px] font-mono text-on-surface-variant uppercase tracking-[0.2em]">Heritage Apiary Management System v2.4.0</p>
      </footer>
    </div>
  );
}
