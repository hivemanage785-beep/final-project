import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  User, LogOut, HelpCircle, ChevronRight, Shield, Bell, 
  Info, Hexagon, BarChart3, Cloud, CloudOff, RefreshCw, Database
} from 'lucide-react';
import { auth } from '../firebase';
import { apiGet } from '../services/api';
import { db } from '../lib/db';
import { useSync } from '../hooks/useSync';

interface RowProps {
  Icon: any; label: string; sub?: string; danger?: boolean; onClick?: () => void;
}
const Row = ({ Icon, label, sub, danger, onClick }: RowProps) => (
  <div 
    className={`flex items-center gap-4 p-4 active:bg-slate-50 transition-colors cursor-pointer ${onClick ? '' : 'opacity-50 cursor-not-allowed'}`}
    onClick={onClick}
  >
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${danger ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
      <Icon size={18} strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0 text-left">
      <p className={`text-sm font-bold truncate ${danger ? 'text-rose-600' : 'text-slate-800'}`}>{label}</p>
      {sub && <p className="text-[11px] font-medium text-slate-400 truncate">{sub}</p>}
    </div>
    {!danger && onClick && <ChevronRight size={16} className="text-slate-300" />}
  </div>
);

export const MorePage = ({ user }: any) => {
  const navigate = useNavigate();
  const { isOnline, isSyncing } = useSync();
  const outboxCount = useLiveQuery(() => db.outbox.count()) || 0;
  
  const name = user?.displayName || 'Beekeeper';
  const email = user?.email || '';
  const inits = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const [feedbackData, setFeedbackData] = useState<{ total: number; entries: any[] } | null>(null);
  const [fbLoading, setFbLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/feedback-history')
      .then((d: any) => {
        if (d.success) setFeedbackData({ total: d.total, entries: d.entries || [] });
      })
      .catch(() => {})
      .finally(() => setFbLoading(false));
  }, []);

  const lastSync = useMemo(() => {
    const ts = localStorage.getItem('last_sync_timestamp');
    if (!ts) return 'Never';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [isSyncing]);

  return (
    <div className="page-enter bg-[#f8f9fa] min-h-[100dvh] pb-24 px-4 pt-4">
      <div className="mb-6 pt-2 px-1">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">More</h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">Account & System Control</p>
      </div>

      {/* Profile summary card */}
      <div className="bg-[#990a00] rounded-[28px] p-6 shadow-sm text-white flex items-center gap-5 mb-6 relative overflow-hidden">
        <div className="absolute right-[-10%] top-[-10%] opacity-10">
          <Hexagon size={120} fill="white" />
        </div>
        <div className="w-16 h-16 shrink-0 rounded-[20px] bg-white/20 flex items-center justify-center text-white font-black text-xl border border-white/20 shadow-sm backdrop-blur-sm">
          {inits}
        </div>
        <div className="min-w-0 z-10">
          <h2 className="text-xl font-bold truncate leading-tight">{name}</h2>
          <p className="text-sm font-medium text-white/60 truncate mb-2">{email}</p>
          <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-white/10 border border-white/10 inline-flex">
            <Shield size={12} className="text-white/80" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Active Session</span>
          </div>
        </div>
      </div>

      {/* System Status Section - High Density Operational Data */}
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">System Status</h3>
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 mb-8">
        <div className="grid grid-cols-2 gap-y-6">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isOnline ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              {isOnline ? <Cloud size={16} /> : <CloudOff size={16} />}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Connectivity</p>
              <p className="text-xs font-black text-slate-800">{isOnline ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSyncing ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Data Sync</p>
              <p className="text-xs font-black text-slate-800">{isSyncing ? 'Syncing...' : 'Stable'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
              <Database size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Offline Queue</p>
              <p className="text-xs font-black text-slate-800">{outboxCount} Pending</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Last Update</p>
              <p className="text-xs font-black text-slate-800">{lastSync}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation Groups */}
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Management</h3>
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden mb-8">
        <Row Icon={BarChart3} label="Performance" sub={fbLoading ? 'Loading data...' : `${feedbackData?.total || 0} feedback entries`} onClick={() => navigate('/feedback-history')} />
        <div className="h-px bg-slate-50 mx-4" />
        <Row Icon={User} label="Profile Details" sub="Identity & account settings" onClick={() => navigate('/profile')} />
        <div className="h-px bg-slate-50 mx-4" />
        <Row Icon={Bell} label="Intelligence Rules" sub="Notification & alert thresholds" onClick={() => navigate('/notifications')} />
      </div>

      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Support</h3>
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden mb-8">
        <Row Icon={HelpCircle} label="Technical Help" sub="System FAQs & user guides" onClick={() => navigate('/help')} />
        <div className="h-px bg-slate-50 mx-4" />
        <Row Icon={Info} label="Legal & Privacy" sub="Version 1.2 · Terms of service" onClick={() => navigate('/about')} />
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        <Row Icon={LogOut} label="Terminate Session" danger onClick={() => auth.signOut()} />
      </div>

      <p className="mt-8 mb-4 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center">
        HiveOps · Precision Ecosystem
      </p>
    </div>
  );
};
import { Clock } from 'lucide-react';

