import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  User, LogOut, HelpCircle, ChevronRight, Shield, Bell, 
  Info, Hexagon, BarChart3, Cloud, CloudOff, RefreshCw, Database, Clock
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
    className={`flex items-center gap-4 py-5 px-4 active:bg-slate-50 transition-colors cursor-pointer ${onClick ? '' : 'opacity-50 cursor-not-allowed'}`}
    onClick={onClick}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-500'}`}>
      <Icon size={19} strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0 text-left">
      <p className={`text-[15px] font-bold tracking-tight ${danger ? 'text-rose-600' : 'text-slate-800'}`}>{label}</p>
      {sub && <p className="text-[12px] text-slate-400 font-medium truncate mt-0.5">{sub}</p>}
    </div>
    {!danger && onClick && <ChevronRight size={18} className="text-slate-300" />}
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
    <div className="page-enter bg-[#f8f9fa] min-h-[100dvh] pb-12">
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Management</h1>
        <p className="text-sm font-medium text-slate-400 mt-1">Manage your account and application settings</p>
      </div>

      {/* Profile summary card */}
      <div className="bg-[#5D0623] rounded-2xl p-6 shadow-sm text-white flex items-center gap-4 mb-8 relative overflow-hidden">
        <div className="absolute right-[-5%] top-[-20%] opacity-10">
          <Hexagon size={120} fill="white" />
        </div>
        <div className="w-14 h-14 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xl border border-white/20 backdrop-blur-sm z-10">
          {inits}
        </div>
        <div className="min-w-0 z-10">
          <h2 className="text-lg font-bold truncate leading-tight">{name}</h2>
          <p className="text-xs font-medium text-white/70 truncate mb-2">{email}</p>
          <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-white/10 border border-white/10 inline-flex">
            <Shield size={10} className="text-white/80" />
            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Active Session</span>
          </div>
        </div>
      </div>

      {/* System Status Section - High Density Operational Data */}
      <div className="mb-8">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] mb-3 px-2">App Status</h3>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {isOnline ? <Cloud size={16} /> : <CloudOff size={16} />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Connectivity</p>
                <p className="text-[15px] font-bold text-slate-800">{isOnline ? 'Online' : 'Offline'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isSyncing ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sync Status</p>
                <p className="text-[15px] font-bold text-slate-800">{isSyncing ? 'Syncing...' : 'Stable'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
                <Database size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Sync</p>
                <p className="text-[15px] font-bold text-slate-800">{outboxCount} items</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
                <Clock size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Update</p>
                <p className="text-[15px] font-bold text-slate-800">{lastSync}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation Groups */}
      <div className="mb-8">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] mb-3 px-2">Account & Performance</h3>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Row Icon={BarChart3} label="Performance History" sub={fbLoading ? 'Checking entries...' : `${feedbackData?.total || 0} activity logs recorded`} onClick={() => navigate('/feedback-history')} />
          <div className="h-px bg-slate-50 mx-4" />
          <Row Icon={User} label="Profile Details" sub="Manage your identity and bio" onClick={() => navigate('/profile')} />
          <div className="h-px bg-slate-50 mx-4" />
          <Row Icon={Bell} label="Alert Settings" sub="Notification & warning thresholds" onClick={() => navigate('/notifications')} />
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] mb-3 px-2">Support & Info</h3>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Row Icon={HelpCircle} label="Help Center" sub="Frequently asked questions & guides" onClick={() => navigate('/help')} />
          <div className="h-px bg-slate-50 mx-4" />
          <Row Icon={Info} label="Legal & Privacy" sub="Version 1.2 · Product transparency" onClick={() => navigate('/about')} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <Row Icon={LogOut} label="Sign Out" danger onClick={() => auth.signOut()} />
      </div>

      <p className="mt-8 mb-4 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center">
        HiveOps · Precision Ecosystem
      </p>
    </div>
  );
};


