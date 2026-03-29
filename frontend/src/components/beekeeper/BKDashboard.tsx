/**
 * Beekeeper Dashboard — "Today" view for mobile-first field work
 */
import React from 'react';
import { 
  ClipboardList, AlertTriangle, Hexagon, 
  MapPin, ChevronRight, CheckCircle2,
  Calendar, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useHives, useActiveAlerts } from '../../hooks/useLocalData';
import { HealthBadge, EmptyState } from '../shared';
import { cn } from '../../lib/utils';

interface BKDashboardProps {
  onNavigate: (screen: string, id?: string) => void;
  userName: string;
}

export function BKDashboard({ onNavigate, userName }: BKDashboardProps) {
  const hives  = useHives() ?? [];
  const alerts = useActiveAlerts() ?? [];

  // Filter for hives assigned to current user (mocked for now)
  const assignedHives = hives.slice(0, 5); 
  const urgentHives   = assignedHives.filter(h => h.health < 50);
  const pendingTasks  = assignedHives.length;

  return (
    <div className="pb-24 space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start pt-2">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Hello, {userName.split(' ')[0]}!</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Today's Schedule</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Calendar className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* Primary CTA */}
      <button 
        onClick={() => onNavigate('inspection')}
        className="w-full bg-slate-900 rounded-3xl p-6 text-left relative overflow-hidden group active:scale-95 transition-transform"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ClipboardList className="w-24 h-24 rotate-12" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white leading-tight">Start Regular<br />Inspection</h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2">Next hive: {assignedHives[0]?.name ?? 'N/A'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>
      </button>

      {/* Critical Status Row */}
      {urgentHives.length > 0 && (
        <section className="bg-red-50 rounded-2xl border border-red-100 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-red-700 uppercase tracking-tight">{urgentHives.length} Hives Need Attention</p>
            <p className="text-[10px] text-red-600 font-medium">Critical health levels detected.</p>
          </div>
          <button onClick={() => onNavigate('hives')} className="p-2 bg-red-100 rounded-lg">
            <ChevronRight className="w-4 h-4 text-red-600" />
          </button>
        </section>
      )}

      {/* Assigned Hives Horizontal Scroller (Quick View) */}
      <section className="space-y-3">
        <div className="flex justify-between items-end px-1">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Your Hives</h3>
          <button onClick={() => onNavigate('hives')} className="text-[10px] font-bold text-primary uppercase">View Map</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {assignedHives.map(hive => (
            <div 
              key={hive.id}
              onClick={() => onNavigate('hives', hive.id)}
              className="min-w-[140px] bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3 active:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <HealthBadge health={hive.health} size="sm" />
                <span className="text-[10px] font-mono font-bold text-slate-400">{hive.health}%</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 truncate">{hive.name}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{hive.apiary}</p>
              </div>
            </div>
          ))}
          {assignedHives.length === 0 && (
            <div className="w-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">No hives assigned</p>
            </div>
          )}
        </div>
      </section>

      {/* Active Alerts */}
      <section className="space-y-3">
        <div className="flex justify-between items-end px-1">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Active Alerts</h3>
          <button onClick={() => onNavigate('alerts')} className="text-[10px] font-bold text-primary uppercase">History</button>
        </div>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 flex flex-col items-center text-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">All clear</p>
            </div>
          ) : (
            alerts.slice(0, 3).map(alert => (
              <div 
                key={alert.id}
                onClick={() => onNavigate('alerts')}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 active:bg-slate-50 transition-colors"
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  alert.priority === 'high' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                )}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-700 truncate uppercase tracking-tight">{alert.message}</p>
                  <p className="text-[9px] text-slate-400 font-bold">{format(new Date(alert.timestamp), 'HH:mm')} · {alert.hiveId}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
