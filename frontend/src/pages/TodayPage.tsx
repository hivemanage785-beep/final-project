import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Hexagon, Clock, CheckCircle2, AlertTriangle, AlertCircle, 
  MapPin, Bell, Wifi, WifiOff, RefreshCw, ChevronRight, Zap, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { useSync } from '../hooks/useSync';
import { fetchAlerts, Alert } from '../api/alertApi';
import { fetchSuggestions, SuggestedLocation } from '../api/scoreApi';
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
  <div className="flex items-center justify-between mb-6 pt-2 px-1">
    <div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Today</h1>
      <div className="flex items-center gap-2 mt-0.5">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        <span className="text-sm text-slate-500 font-medium">
          {isOnline ? 'Cloud connected' : 'Offline'}
        </span>
      </div>
    </div>
    <div className="w-12 h-12 shrink-0 rounded-full bg-[#990a00] flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden border-2 border-white">
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

const KPIContainer = ({ stats, loading }: any) => (
  <div className="grid grid-cols-2 gap-4 mb-8">
    <div className="bg-[#9b0a00] p-5 rounded-[24px] shadow-sm text-white flex flex-col min-h-[160px]">
      <div className="w-12 h-12 bg-white/10 rounded-[14px] flex items-center justify-center border border-white/5 mb-auto">
        <Hexagon size={24} className="text-white/90" strokeWidth={2} />
      </div>
      <div className="mt-6">
        {loading ? (
          <div className="h-10 w-12 bg-white/20 rounded animate-pulse mb-1" />
        ) : (
          <div className="text-[clamp(24px,8vw,44px)] font-bold tracking-tight leading-[1] mb-1">{stats.totalHives}</div>
        )}
        <div className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Total Hives</div>
      </div>
    </div>
    
    <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex flex-col min-h-[160px]">
      <div className="w-12 h-12 bg-slate-50 rounded-[14px] flex items-center justify-center border border-slate-50 mb-auto">
        <Clock size={24} className="text-[#9b0a00]" strokeWidth={2} />
      </div>
      <div className="mt-6">
        {loading ? (
          <div className="h-10 w-12 bg-slate-100 rounded animate-pulse mb-1" />
        ) : (
          <div className="text-[clamp(24px,8vw,44px)] font-bold tracking-tight leading-[1] text-slate-900 mb-1">{stats.overdue}</div>
        )}
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Due Checks</div>
      </div>
    </div>
  </div>
);

const HealthOverview = ({ hives, loading }: any) => {
  const healthy = hives.filter((h: any) => h.health_status === 'good').length;
  const needsAttention = hives.filter((h: any) => h.health_status === 'fair').length;
  const critical = hives.filter((h: any) => h.health_status === 'poor').length;

  return (
    <div className="mb-8">
      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Health Overview</h3>
      <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-[40px] rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} className="text-emerald-500" strokeWidth={2} />
            </div>
            <span className="text-[14px] font-semibold text-slate-800">Healthy & Thriving</span>
          </div>
          <span className="text-[16px] font-bold text-slate-900 pr-1">{loading ? '-' : healthy}</span>
        </div>
        
        <div className="flex items-center justify-between p-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-[40px] rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-500" strokeWidth={2} />
            </div>
            <span className="text-[14px] font-semibold text-slate-800">Needs Attention</span>
          </div>
          <span className="text-[16px] font-bold text-slate-900 pr-1">{loading ? '-' : needsAttention}</span>
        </div>
        
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-[40px] rounded-full bg-rose-50 flex items-center justify-center shrink-0">
              <AlertCircle size={18} className="text-rose-500" strokeWidth={2} />
            </div>
            <span className="text-[14px] font-semibold text-slate-800">Critical</span>
          </div>
          <span className="text-[16px] font-bold text-slate-900 pr-1">{loading ? '-' : critical}</span>
        </div>

      </div>
    </div>
  );
};

/* ── Page ── */
export const TodayPage = ({ user }: any) => {
  const { isOnline, isSyncing } = useSync();
  const pendingCount = useLiveQuery(() => db.outbox.count()) || 0;
  
  const hivesQuery = useLiveQuery(() => db.hives.where('uid').equals(user?.uid || '').toArray(), [user]);
  const hives = hivesQuery || [];
  const isHivesLoading = hivesQuery === undefined;

  const savedLocationsQuery = useLiveQuery(() => db.savedLocations.where('uid').equals(user?.uid || '').toArray(), [user]);
  const savedLocations = savedLocationsQuery || [];
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOpsData = async () => {
      setLoading(true);
      try {
        const [alertData, sugData] = await Promise.all([
          fetchAlerts().catch(() => []),
          fetchSuggestions(11.1271, 78.6569).catch(() => [])
        ]);
        setAlerts(alertData);
        setSuggestions(sugData);
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
    bestSpots: savedLocations.filter(l => (l.score || 0) >= 70).length,
    alerts: alerts.filter(a => a.unread).length
  }), [hives, savedLocations, alerts]);

  return (
    <div className="page-enter bg-[#f8f9fa] min-h-[100dvh] pb-24 px-4 pt-4">
      <StatusHeader 
        photoURL={user?.photoURL}
        displayName={user?.displayName}
        isOnline={isOnline}
      />

      <KPIContainer stats={stats} loading={loading || isHivesLoading} />

      <HealthOverview hives={hives} loading={loading || isHivesLoading} />

      {/* Recent Activity Section */}
      <div className="mb-8">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Recent Activity</h3>
        
        <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-4"><OperationalSkeleton rows={3} type="list" /></div>
          ) : hives.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
               <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                 <Hexagon size={24} className="text-slate-300" strokeWidth={1.5} />
               </div>
               <p className="text-[14px] font-semibold text-slate-400">No hives added yet</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center">
               <p className="text-[13px] font-medium text-slate-400">No recent activity</p>
            </div>
          ) : alerts.slice(0, 3).map((alert, i) => (
            <div key={alert.id || i} className={`flex items-center justify-between p-4 ${i !== Math.min(alerts.length, 3) - 1 ? 'border-b border-slate-50' : ''}`}>
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 min-w-[40px] rounded-full flex items-center justify-center shrink-0 ${
                   alert.type === 'critical' ? 'bg-rose-50 text-rose-500' : 
                   alert.type === 'warning' ? 'bg-amber-50 text-amber-500' :
                   'bg-emerald-50 text-emerald-500'
                 }`}>
                   {alert.type === 'critical' ? <AlertCircle size={18} strokeWidth={2} /> : 
                    alert.type === 'warning' ? <AlertTriangle size={18} strokeWidth={2} /> :
                    alert.category === 'weather' ? <Hexagon size={18} strokeWidth={2} /> :
                    <CheckCircle2 size={18} strokeWidth={2} />}
                 </div>
                 <div className="flex flex-col justify-center">
                   <p className="text-[14px] font-semibold text-slate-800 leading-tight">
                     {alert.title}
                   </p>
                   <p className="text-[12px] text-slate-500 mt-0.5">
                     {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                   </p>
                 </div>
               </div>
               <ChevronRight size={18} className="text-slate-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

