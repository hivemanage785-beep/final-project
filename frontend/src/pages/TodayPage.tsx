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
import { isOverdue } from '../utils/isOverdue';

/* ── Helpers ── */
const initials = (name?: string) =>
  name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'BK';

/* ── Sub-components ── */
const StatusHeader = ({ photoURL, displayName, isOnline }: any) => (
  <div className="flex items-start justify-between mb-6 pt-2 px-1">
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">Today</h1>
      <div className="flex items-center gap-1.5 mt-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        <span className="text-[11px] font-medium text-slate-500 tracking-wide uppercase">
          {isOnline ? 'Cloud connected' : 'Offline Mode'}
        </span>
      </div>
    </div>
    <div className="w-9 h-9 shrink-0 rounded-full bg-[#5D0623] flex items-center justify-center text-white font-semibold text-xs shadow-sm overflow-hidden border border-slate-200 mt-0.5">
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
    <div className="mb-6">
      <Link
        to="/hives"
        className="flex items-center gap-3 bg-rose-50/50 border border-rose-100 rounded-2xl py-2.5 px-3 shadow-sm active:scale-[0.98] transition-transform"
      >
        <div className="shrink-0 w-6 h-6 bg-white rounded-lg flex items-center justify-center text-rose-500 border border-rose-100/50">
          <AlertCircle size={14} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0 flex items-center">
          <p className="text-xs text-rose-900/80 truncate">
            <span className="font-bold">{alert.title.split(' - ')[0]}</span> — <span className="font-medium text-rose-700/80">{alert.title.split(' - ')[1] || alert.desc}</span>
          </p>
        </div>
        <ChevronRight size={14} className="text-rose-300 shrink-0" />
      </Link>
    </div>
  );
};

const KPICard = ({
  bg, border, icon, metric, label, metricColor, decorative, dark = false
}: {
  bg: string; border: string; icon: React.ReactNode;
  metric: React.ReactNode; label: string;
  metricColor: string; decorative?: React.ReactNode;
  dark?: boolean;
}) => (
  <div
    className="relative w-full h-[148px] rounded-[24px] shadow-sm p-6 overflow-hidden"
    style={{ backgroundColor: bg, border: border || 'none' }}
  >
    {/* LOCK: Decorative Background */}
    {decorative && (
      <div className="absolute -right-3 -top-3 opacity-[0.08] pointer-events-none z-0">
        {decorative}
      </div>
    )}

    {/* 1. HEADER REGION — Fixed structural height for Icon */}
    <div className="h-9 flex items-center relative z-10 mb-1">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${dark ? 'bg-white/10 border border-white/10' : 'bg-rose-50'}`}>
        {icon}
      </div>
    </div>

    {/* 2. METRIC REGION — Isolated fixed-height region for the number with STABLE LEFT PADDING */}
    <div className="h-[60px] flex items-center relative z-10">
      <div 
        className="text-[34px] font-black leading-none tracking-tighter"
        style={{ color: metricColor }}
      >
        {metric}
      </div>
    </div>

    {/* 3. LABEL REGION — Dedicated bottom region for label with STABLE LEFT PADDING */}
    <div className="absolute bottom-6 left-6 right-6 h-4 flex items-center relative z-10">
      <div 
        className={`text-[10px] font-black uppercase tracking-[0.1em] ${dark ? 'text-white/60' : 'text-slate-400'}`}
        style={{ color: dark ? undefined : metricColor }}
      >
        {label}
      </div>
    </div>
  </div>
);

const KPIContainer = ({ stats, loading }: any) => (
  <div className="grid grid-cols-2 gap-3 mb-6">
    <KPICard
      bg="#5D0623"
      border="none"
      metricColor="#ffffff"
      dark
      icon={<Hexagon size={16} color="white" strokeWidth={2.5} />}
      decorative={<Hexagon size={80} fill="white" />}
      metric={loading ? '..' : stats.totalHives}
      label="Total Hives"
    />
    <KPICard
      bg="#ffffff"
      border="1px solid #f1f5f9"
      metricColor={stats.overdue > 0 ? '#5D0623' : '#0f172a'}
      icon={<Clock size={16} color="#5D0623" strokeWidth={2.5} />}
      metric={loading ? '..' : stats.overdue}
      label="Due Checks"
    />
  </div>
);


const HealthOverview = ({ hives, loading }: any) => {
  const healthy = hives.filter((h: any) => h.health_status === 'good').length;
  const needsAttention = hives.filter((h: any) => h.health_status === 'fair').length;
  const critical = hives.filter((h: any) => h.health_status === 'poor').length;

  return (
    <div className="mb-6">
      {/* FIX #6: Single authoritative section label style */}
      <h3 className="section-label mb-2 px-1">Health Overview</h3>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* FIX #2/#5: gap-based row spacing, normalized icon size to w-8 h-8 */}
        <div className="flex items-center justify-between py-3 px-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} className="text-emerald-500" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-slate-700">Healthy & Thriving</span>
          </div>
          <span className="text-sm font-bold text-slate-900 tabular-nums">{loading ? '..' : healthy}</span>
        </div>

        <div className="flex items-center justify-between py-3 px-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={15} className="text-amber-500" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-slate-700">Needs Attention</span>
          </div>
          <span className="text-sm font-bold text-slate-900 tabular-nums">{loading ? '..' : needsAttention}</span>
        </div>

        <div className="flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
              <AlertCircle size={15} className="text-rose-500" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-slate-700">Critical Status</span>
          </div>
          <span className="text-sm font-bold text-[#5D0623] tabular-nums">{loading ? '..' : critical}</span>
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
    <div className="page-enter bg-[#f8f9fa]">
      <StatusHeader
        displayName={user?.displayName}
        photoURL={user?.photoURL}
        isOnline={isOnline}
      />

      <PriorityBanner alert={priorityAlert} />

      {hives.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm text-center mt-4">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100">
            <Hexagon size={32} className="text-[#5D0623]" strokeWidth={2} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Welcome to HiveOps</h2>
          <p className="text-sm text-slate-500 mb-8 max-w-[240px] mx-auto">
            Begin your precision beekeeping journey by registering your first apiary unit.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="w-full bg-[#5D0623] text-white py-3.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-[#4a051c] active:scale-[0.98] transition-all"
          >
            Register First Hive
          </button>
        </div>
      ) : (
        <>
          <KPIContainer stats={stats} loading={loading} />

          <HealthOverview hives={hives} loading={loading} />

          {/* Recent Activity — FIX #2/#5/#6: gap spacing, normalized icons w-8 h-8, unified section label */}
          <div className="mb-6">
            <h3 className="section-label mb-2 px-1">Recent Activity</h3>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-4"><OperationalSkeleton rows={3} type="list" /></div>
              ) : filteredActivity.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">System Idle</div>
              ) : filteredActivity.map((alert: any, i) => (
                <Link
                  key={alert.id || i}
                  to="/hives"
                  className={`flex items-center gap-3 px-4 py-3 active:bg-slate-50 transition-colors ${i !== filteredActivity.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  {/* FIX #5: normalized to w-8 h-8 matching health overview */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    alert.type === 'critical' ? 'bg-rose-50 text-rose-500' :
                    alert.type === 'warning'  ? 'bg-amber-50 text-amber-500' :
                                                'bg-emerald-50 text-emerald-500'
                  }`}>
                    {alert.type === 'critical' ? <AlertCircle size={15} strokeWidth={2} /> :
                     alert.type === 'warning'  ? <AlertTriangle size={15} strokeWidth={2} /> :
                                                 <CheckCircle2 size={15} strokeWidth={2} />}
                  </div>
                  {/* FIX #2: gap-based layout, no mb-* stacking inside text block */}
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                      {alert.title}
                    </p>
                    <p className="text-xs text-slate-400 leading-tight">
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recorded'}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <AddHiveSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={() => { }}
      />
    </div>
  );
};

