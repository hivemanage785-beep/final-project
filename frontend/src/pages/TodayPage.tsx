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
  <div className="flex items-center justify-between mb-4 pt-2 px-1">
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

const PriorityAction = ({ alert }: { alert: Alert | null }) => {
  if (!alert) return null;

  const severityColor = alert.type === 'critical' ? 'rose' : alert.type === 'warning' ? 'amber' : 'blue';
  const Icon = alert.type === 'critical' ? AlertCircle : alert.type === 'warning' ? AlertTriangle : Info;

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Priority Action</h3>
      <div className={`bg-${severityColor}-50 border border-${severityColor}-100 rounded-[24px] p-5 flex items-start gap-4 shadow-sm relative overflow-hidden`}>
        <div className={`shrink-0 w-12 h-12 bg-white rounded-[14px] flex items-center justify-center border border-${severityColor}-100 shadow-sm`}>
          <Icon size={24} className={`text-${severityColor}-500`} />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <p className={`text-[10px] font-black text-${severityColor}-700 uppercase tracking-widest mb-1`}>{alert.type} Intervention</p>
          <h4 className="text-[15px] font-bold text-slate-900 leading-tight mb-1 truncate">{alert.title}</h4>
          <p className="text-[12px] text-slate-600 leading-snug line-clamp-2">{alert.desc}</p>
        </div>
        {alert.id && (
          <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 opacity-50" />
        )}
      </div>
    </div>
  );
};

const KPIContainer = ({ stats, loading }: any) => (
  <div className="grid grid-cols-2 gap-4 mb-8">
    <div className="bg-[#9b0a00] p-4 rounded-[24px] shadow-sm text-white flex flex-col min-h-[128px]">
      <div className="w-10 h-10 bg-white/10 rounded-[12px] flex items-center justify-center border border-white/5 mb-auto">
        <Hexagon size={20} className="text-white/90" strokeWidth={2} />
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-10 bg-white/20 rounded animate-pulse mb-1" />
        ) : (
          <div className="text-[clamp(20px,6vw,36px)] font-bold tracking-tight leading-[1] mb-1">{stats.totalHives}</div>
        )}
        <div className="text-[9px] font-bold text-white/80 uppercase tracking-widest">Total Hives</div>
      </div>
    </div>
    
    <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 flex flex-col min-h-[128px]">
      <div className="w-10 h-10 bg-slate-50 rounded-[12px] flex items-center justify-center border border-slate-50 mb-auto">
        <Clock size={20} className="text-[#9b0a00]" strokeWidth={2} />
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-10 bg-slate-100 rounded animate-pulse mb-1" />
        ) : (
          <div className="text-[clamp(20px,6vw,36px)] font-bold tracking-tight leading-[1] text-slate-900 mb-1">{stats.overdue}</div>
        )}
        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Due Checks</div>
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const hivesQuery = useLiveQuery(() => db.hives.where('uid').equals(user?.uid || '').toArray(), [user]);
  const hives = hivesQuery || [];
  const isHivesLoading = hivesQuery === undefined;

  const savedLocationsQuery = useLiveQuery(() => db.savedLocations.where('uid').equals(user?.uid || '').toArray(), [user]);
  const savedLocations = savedLocationsQuery || [];
  
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

  const priorityAlert = useMemo(() => {
    if (alerts.length === 0) return null;
    const severityMap = { critical: 3, warning: 2, info: 1, success: 0 };
    return [...alerts].sort((a, b) => severityMap[b.type] - severityMap[a.type])[0];
  }, [alerts]);

  if (isHivesLoading) return <OperationalLoading />;

  return (
    <div className="page-enter bg-[#f8f9fa] min-h-[100dvh] pb-24 px-4 pt-4">
      <StatusHeader 
        photoURL={user?.photoURL}
        displayName={user?.displayName}
        isOnline={isOnline}
      />

      <PriorityAction alert={priorityAlert} />

      {hives.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-slate-100 p-8 shadow-sm text-center mb-8">
           <div className="w-16 h-16 bg-rose-50 rounded-[20px] flex items-center justify-center mx-auto mb-6 border border-rose-100">
             <Hexagon size={32} className="text-[#990a00]" />
           </div>
           <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Welcome to HiveOps</h2>
           <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-[240px] mx-auto">
             Begin your precision beekeeping journey by registering your first apiary unit.
           </p>
           <button 
             onClick={() => setIsAddOpen(true)}
             className="w-full bg-[#5D0623] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
           >
             <Plus size={18} strokeWidth={3} /> Register First Hive
           </button>
        </div>
      ) : (
        <>
          <KPIContainer stats={stats} loading={loading} />
          <HealthOverview hives={hives} loading={loading} />
          
          <div className="mb-8">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Recent Activity</h3>
            <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-4"><OperationalSkeleton rows={3} type="list" /></div>
              ) : alerts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">No recent activity</div>
              ) : alerts.slice(0, 3).map((alert: any, i) => {
                const hasLink = !!alert.hive_id;
                const content = (
                  <div className="flex items-center justify-between w-full">
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
                      <div className="flex flex-col justify-center text-left">
                        <p className="text-[14px] font-semibold text-slate-800 leading-tight">{alert.title}</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </p>
                      </div>
                    </div>
                    {hasLink && <ChevronRight size={18} className="text-slate-300" />}
                  </div>
                );

                return hasLink ? (
                  <Link 
                    key={alert.id || i} 
                    to="/hives" 
                    className={`flex items-center p-4 active:bg-slate-50 transition-colors ${i !== Math.min(alerts.length, 3) - 1 ? 'border-b border-slate-50' : ''}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div 
                    key={alert.id || i} 
                    className={`flex items-center p-4 ${i !== Math.min(alerts.length, 3) - 1 ? 'border-b border-slate-50' : ''}`}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <AddHiveSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
};

