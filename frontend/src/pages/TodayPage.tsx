import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Hexagon, Clock, CheckCircle2, AlertTriangle, AlertCircle, 
  MapPin, Bell, Wifi, WifiOff, RefreshCw, ChevronRight, Zap, Info, Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { useSync } from '../hooks/useSync';
import { fetchAlerts, Alert } from '../api/alertApi';
import { fetchSuggestions, SuggestedLocation } from '../api/scoreApi';
import { AddHiveSheet } from '../modules/hives/AddHiveSheet';
import { 
  OperationalSkeleton, OperationalLoading, OperationalEmptyState, OperationalError 
} from '../components/states/OperationalUI';

/* ── Helpers ── */
const initials = (name?: string) =>
  name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'BK';

const isOverdue = (date?: string) => {
  if (!date) return false;
  const diff = (new Date().getTime() - new Date(date).getTime()) / (1000 * 3600 * 24);
  return diff > 14;
};

/* ── Sub-components ── */
const StatusHeader = ({ photoURL, displayName, isOnline }: any) => (
  <div className="flex items-center justify-between mb-8 pt-2 px-1">
    <div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Today</h1>
      <div className="flex items-center gap-2 mt-1">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          {isOnline ? 'Cloud connected' : 'Offline Mode'}
        </span>
      </div>
    </div>
    <div className="w-12 h-12 shrink-0 rounded-[18px] bg-[#990a00] flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden border-2 border-white">
      {photoURL ? (
        <img 
          src={photoURL} 
          alt="" 
          className="w-full h-full object-cover" 
          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = `<span>${initials(displayName)}</span>`; }} 
        />
      ) : (
        <span>{initials(displayName)}</span>
      )}
    </div>
  </div>
);

const PriorityBanner = ({ alert }: { alert: Alert | null }) => {
  if (!alert || alert.type !== 'critical') return null;

  return (
    <div className="mb-8 px-1">
      <Link 
        to="/hives"
        className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-[20px] p-4 shadow-sm active:scale-[0.98] transition-transform"
      >
        <div className="shrink-0 w-8 h-8 bg-white rounded-xl flex items-center justify-center text-rose-500 border border-rose-100">
          <AlertCircle size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-rose-900 truncate">
            {alert.title.split(' - ')[0]} — <span className="font-medium text-rose-700">{alert.title.split(' - ')[1] || alert.desc}</span>
          </p>
        </div>
        <ChevronRight size={16} className="text-rose-300" />
      </Link>
    </div>
  );
};

const KPIContainer = ({ stats, loading }: any) => (
  <div className="grid grid-cols-2 gap-4 mb-10">
    <div className="bg-[#9b0a00] pt-7 pb-7 pr-7 pl-10 rounded-[28px] shadow-sm text-white flex flex-col min-h-[140px] relative overflow-hidden">
      <div className="absolute right-[-10%] top-[-10%] opacity-10">
        <Hexagon size={80} fill="white" />
      </div>
      <div className="w-10 h-10 bg-white/10 rounded-[14px] flex items-center justify-center border border-white/5 mb-auto">
        <Hexagon size={20} className="text-white/90" strokeWidth={2} />
      </div>
      <div className="mt-4">
        <div className="text-[clamp(28px,6vw,42px)] font-black tracking-tight leading-none mb-1">
          {loading ? '..' : stats.totalHives}
        </div>
        <div className="text-[10px] font-black text-white/60 uppercase tracking-[0.1em]">Total Hives</div>
      </div>
    </div>
    
    <div className="bg-white pt-7 pb-7 pr-7 pl-10 rounded-[28px] shadow-sm border border-slate-100 flex flex-col min-h-[140px]">
      <div className="w-10 h-10 bg-slate-50 rounded-[14px] flex items-center justify-center border border-slate-50 mb-auto">
        <Clock size={20} className="text-[#9b0a00]" strokeWidth={2} />
      </div>
      <div className="mt-4">
        <div className={`text-[clamp(28px,6vw,42px)] font-black tracking-tight leading-none mb-1 ${stats.overdue > 0 ? 'text-[#9b0a00]' : 'text-slate-900'}`}>
          {loading ? '..' : stats.overdue}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Due Checks</div>
      </div>
    </div>
  </div>
);

const HealthOverview = ({ hives, loading }: any) => {
  const healthy = hives.filter((h: any) => h.health_status === 'good').length;
  const needsAttention = hives.filter((h: any) => h.health_status === 'fair').length;
  const critical = hives.filter((h: any) => h.health_status === 'poor').length;

  return (
    <div className="mb-10">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Health Overview</h3>
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} className="text-emerald-500" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-bold text-slate-700">Healthy & Thriving</span>
          </div>
          <span className="text-[17px] font-black text-slate-900 pr-2">{loading ? '..' : healthy}</span>
        </div>
        
        <div className="flex items-center justify-between p-6 border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-500" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-bold text-slate-700">Needs Attention</span>
          </div>
          <span className="text-[17px] font-black text-slate-900 pr-2">{loading ? '..' : needsAttention}</span>
        </div>
        
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
              <AlertCircle size={18} className="text-rose-500" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-bold text-slate-700">Critical Status</span>
          </div>
          <span className="text-[17px] font-black text-[#9b0a00] pr-2">{loading ? '..' : critical}</span>
        </div>

      </div>
    </div>
  );
};

/* ── Page ── */
export const TodayPage = ({ user }: any) => {
  const { isOnline } = useSync();
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const hivesQuery = useLiveQuery(() => db.hives.where('uid').equals(user?.uid || '').toArray(), [user]);
  const hives = hivesQuery || [];
  const isHivesLoading = hivesQuery === undefined;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOpsData = async () => {
      setLoading(true);
      try {
        const alertData = await fetchAlerts().catch(() => []);
        setAlerts(alertData);
      } finally {
        setLoading(false);
      }
    };
    if (isOnline) loadOpsData();
    else setLoading(false);
  }, [isOnline]);

  const stats = useMemo(() => ({
    totalHives: hives.length,
    overdue: hives.filter(h => isOverdue(h.last_inspection_date)).length,
  }), [hives]);

  // Priority selection logic for Hero Banner
  const priorityAlert = useMemo(() => {
    const criticals = alerts.filter(a => a.type === 'critical');
    if (criticals.length === 0) return null;
    return criticals[0];
  }, [alerts]);

  // Deduplication for Activity Feed
  const filteredActivity = useMemo(() => {
    if (!priorityAlert) return alerts.slice(0, 4);
    return alerts.filter(a => a.id !== priorityAlert.id).slice(0, 4);
  }, [alerts, priorityAlert]);

  if (isHivesLoading) return <OperationalLoading />;

  return (
    <div className="page-enter bg-[#f8f9fa] min-h-[100dvh] pb-24 px-4 pt-4">
      <StatusHeader 
        displayName={user?.displayName}
        photoURL={user?.photoURL}
        isOnline={isOnline} 
      />

      <PriorityBanner alert={priorityAlert} />

      {hives.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm text-center">
           <div className="w-20 h-20 bg-rose-50 rounded-[28px] flex items-center justify-center mx-auto mb-8 border border-rose-100">
             <Hexagon size={40} className="text-[#990a00]" strokeWidth={2.5} />
           </div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Welcome to HiveOps</h2>
           <p className="text-[13px] font-medium text-slate-400 mb-10 leading-relaxed max-w-[240px] mx-auto">
             Begin your precision beekeeping journey by registering your first apiary unit.
           </p>
           <button 
             onClick={() => setIsAddOpen(true)}
             className="w-full bg-[#5D0623] text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.15em] shadow-lg shadow-rose-900/10 active:scale-95 transition-transform"
           >
             Register First Hive
           </button>
        </div>
      ) : (
        <>
          <KPIContainer stats={stats} loading={loading} />
          
          <HealthOverview hives={hives} loading={loading} />

          {/* Spacious Recent Activity Feed */}
          <div className="mb-10">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Recent Activity</h3>
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-6"><OperationalSkeleton rows={3} type="list" /></div>
              ) : filteredActivity.length === 0 ? (
                <div className="p-10 text-center text-slate-300 text-[11px] font-black uppercase tracking-widest">System Idle</div>
              ) : filteredActivity.map((alert: any, i) => (
                <Link 
                  key={alert.id || i} 
                  to="/hives" 
                  className={`flex items-center justify-between p-6 active:bg-slate-50 transition-colors ${i !== filteredActivity.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      alert.type === 'critical' ? 'bg-rose-50 text-rose-500' : 
                      alert.type === 'warning' ? 'bg-amber-50 text-amber-500' : 
                      'bg-emerald-50 text-emerald-500'
                    }`}>
                      {alert.type === 'critical' ? <AlertCircle size={18} strokeWidth={2.5} /> : 
                       alert.type === 'warning' ? <AlertTriangle size={18} strokeWidth={2.5} /> :
                       <CheckCircle2 size={18} strokeWidth={2.5} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-slate-800 truncate leading-tight mb-1">
                        {alert.title}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Verified'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-200 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <AddHiveSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
};

