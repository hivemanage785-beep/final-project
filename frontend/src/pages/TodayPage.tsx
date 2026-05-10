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
const StatusHeader = ({ isOnline }: any) => (
  <div className="flex items-center justify-between mb-2 pt-2 px-1">
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        {isOnline ? 'System Online' : 'System Offline'}
      </span>
    </div>
    <div className="flex items-center gap-1">
      {isOnline ? <Wifi size={12} className="text-emerald-500" /> : <WifiOff size={12} className="text-rose-500" />}
    </div>
  </div>
);

const PriorityAction = ({ alert }: { alert: Alert | null }) => {
  if (!alert) return null;

  const severityColor = alert.type === 'critical' ? 'rose' : alert.type === 'warning' ? 'amber' : 'blue';
  const Icon = alert.type === 'critical' ? AlertCircle : alert.type === 'warning' ? AlertTriangle : Info;

  return (
    <div className="mb-8">
      <div className="flex items-end justify-between mb-3 px-1">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Today</h1>
      </div>
      
      <div className={`bg-${severityColor}-50 border border-${severityColor}-100 rounded-[28px] p-6 shadow-sm`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`shrink-0 w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-${severityColor}-100 shadow-sm text-${severityColor}-500`}>
            <Icon size={24} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h4 className="text-lg font-black text-slate-900 leading-tight truncate">{alert.title.split(' - ')[0]}</h4>
            <p className={`text-xs font-bold text-${severityColor}-600`}>{alert.title.split(' - ')[1] || alert.desc}</p>
          </div>
        </div>
        
        <Link 
          to="/hives" 
          className={`w-full bg-${severityColor}-500 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`}
        >
          Resolve Now <ChevronRight size={16} strokeWidth={3} />
        </Link>
      </div>
    </div>
  );
};

const KPIContainer = ({ stats, loading }: any) => (
  <div className="grid grid-cols-2 gap-3 mb-6">
    <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
      <div className="text-[28px] font-black text-slate-900 leading-none mb-1">
        {loading ? '..' : stats.totalHives}
      </div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Hives</div>
    </div>
    
    <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
      <div className={`text-[28px] font-black leading-none mb-1 ${stats.overdue > 0 ? 'text-[#9b0a00]' : 'text-slate-900'}`}>
        {loading ? '..' : stats.overdue}
      </div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue</div>
    </div>
  </div>
);

const HealthOverview = ({ hives, loading }: any) => {
  const healthy = hives.filter((h: any) => h.health_status === 'good').length;
  const critical = hives.filter((h: any) => h.health_status === 'poor').length;

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 mb-8 flex items-center justify-around">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-xs font-bold text-slate-600">{loading ? '-' : healthy} Healthy</span>
      </div>
      <div className="w-px h-4 bg-slate-100" />
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-rose-500" />
        <span className="text-xs font-bold text-slate-600">{loading ? '-' : critical} Critical</span>
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

  // Priority selection logic (Fix 6)
  const priorityAlert = useMemo(() => {
    if (alerts.length === 0) return null;
    const severityMap = { critical: 3, warning: 2, info: 1, success: 0 };
    return [...alerts].sort((a, b) => severityMap[b.type] - severityMap[a.type])[0];
  }, [alerts]);

  // Deduplication (Fix 3)
  const filteredActivity = useMemo(() => {
    if (!priorityAlert) return alerts.slice(0, 4);
    return alerts.filter(a => a.id !== priorityAlert.id).slice(0, 4);
  }, [alerts, priorityAlert]);

  if (isHivesLoading) return <OperationalLoading />;

  return (
    <div className="page-enter bg-[#f8f9fa] min-h-[100dvh] pb-24 px-4 pt-4">
      <StatusHeader isOnline={isOnline} />

      <PriorityAction alert={priorityAlert} />

      {hives.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-slate-100 p-8 shadow-sm text-center">
           <div className="w-16 h-16 bg-rose-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-rose-100">
             <Hexagon size={32} className="text-[#990a00]" strokeWidth={2.5} />
           </div>
           <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Welcome</h2>
           <p className="text-xs font-medium text-slate-400 mb-8 leading-relaxed max-w-[200px] mx-auto">
             Begin your journey by registering your first apiary unit.
           </p>
           <button 
             onClick={() => setIsAddOpen(true)}
             className="w-full bg-[#5D0623] text-white py-4 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-rose-900/10 active:scale-95 transition-transform"
           >
             Register First Hive
           </button>
        </div>
      ) : (
        <>
          {/* Compressed Activity Feed (Fix 4) */}
          <div className="mb-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Activity</h3>
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-4"><OperationalSkeleton rows={3} type="list" /></div>
              ) : filteredActivity.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-[11px] font-bold uppercase tracking-wider">All Clear</div>
              ) : filteredActivity.map((alert: any, i) => (
                <Link 
                  key={alert.id || i} 
                  to="/hives" 
                  className={`flex items-center justify-between p-4 active:bg-slate-50 transition-colors ${i !== filteredActivity.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={
                      alert.type === 'critical' ? 'text-rose-500' : 
                      alert.type === 'warning' ? 'text-amber-500' : 
                      'text-emerald-500'
                    }>
                      {alert.type === 'critical' ? <AlertCircle size={16} strokeWidth={3} /> : 
                       alert.type === 'warning' ? <AlertTriangle size={16} strokeWidth={3} /> :
                       <CheckCircle2 size={16} strokeWidth={3} />}
                    </div>
                    <p className="text-[13px] font-bold text-slate-700 truncate pr-2">
                      {alert.title}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          <KPIContainer stats={stats} loading={loading} />
          <HealthOverview hives={hives} loading={loading} />
        </>
      )}

      <AddHiveSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
};

