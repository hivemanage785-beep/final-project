/**
 * Alert Management — Priority-grouped monitoring and resolution
 */
import React, { useState } from 'react';
import { 
  Bell, Search, Filter, AlertTriangle, 
  CheckCircle2, Clock, MapPin, Hexagon,
  ChevronRight, MoreVertical, MessageSquare, UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { useActiveAlerts, useHives } from '../../hooks/useLocalData';
import { db } from '../../db';
import { alertRepository } from '../../repositories/alertRepository';
import { EmptyState, PriorityBadge } from '../shared';

export function AlertManagement() {
  const alerts = useActiveAlerts() ?? [];
  const hives = useHives() ?? [];
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [apiaryFilter, setApiary] = useState('all');

  const filteredAlerts = alerts.filter(a => {
    if (search && !a.message.toLowerCase().includes(search.toLowerCase()) && !a.hiveId?.includes(search)) return false;
    if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
    const hive = hives.find(h => h.id === a.hiveId);
    if (apiaryFilter !== 'all' && hive?.apiary !== apiaryFilter) return false;
    return true;
  });

  const apiaries = Array.from(new Set(hives.map(h => h.apiary)));

  const handleResolve = async (id: string) => {
    await alertRepository.resolve(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Alert Center</h1>
          <p className="text-sm text-slate-500">{alerts.length} active notifications</p>
        </div>
        <div className="bg-red-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-red-100 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-xs font-black text-red-600 uppercase tracking-widest">
            {alerts.filter(a => a.priority === 'high').length} High Priority
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input 
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by message or hive ID…" 
            className="flex-1 text-sm outline-none bg-transparent"
          />
        </div>
        <select value={priorityFilter} onChange={(e) => setPriority(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none">
          <option value="all">All Priorities</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
          <option value="low">Low Only</option>
        </select>
        <select value={apiaryFilter} onChange={(e) => setApiary(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none">
          <option value="all">All Apiaries</option>
          {apiaries.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No active alerts" description="All apiaries are currently stable." />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAlerts.sort((a, b) => {
              const p = { high: 0, medium: 1, low: 2 };
              if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority];
              return b.timestamp - a.timestamp;
            }).map((alert) => {
              const hive = hives.find(h => h.id === alert.hiveId);
              return (
                <div key={alert.id} className={cn(
                  'bg-white rounded-2xl shadow-sm border p-5 flex flex-col md:flex-row gap-5 transition-all hover:shadow-md',
                  alert.priority === 'high' ? 'border-red-100' : 'border-slate-100'
                )}>
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn(
                      'p-3 rounded-xl flex-shrink-0',
                      alert.priority === 'high' ? 'bg-red-50 text-red-500' : 
                      alert.priority === 'medium' ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'
                    )}>
                      {alert.type === 'temp_spike' ? <AlertTriangle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <PriorityBadge priority={alert.priority} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {format(new Date(alert.timestamp), 'dd MMM, HH:mm')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 leading-snug">{alert.message}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Hexagon className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{hive?.name ?? 'Unknown Hive'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{hive?.apiary ?? 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:border-l border-slate-50 md:pl-5">
                    <button 
                      onClick={() => handleResolve(alert.id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-xl hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Resolve
                    </button>
                    <button className="flex-1 md:flex-none p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button className="flex-1 md:flex-none p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
