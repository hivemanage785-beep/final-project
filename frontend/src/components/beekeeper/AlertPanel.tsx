/**
 * Beekeeper Alert Panel — Mobile-first one-tap resolution
 */
import React from 'react';
import { 
  Bell, AlertTriangle, CheckCircle2, 
  MapPin, Hexagon, MessageSquare, 
  X, ChevronRight, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { useActiveAlerts, useHives } from '../../hooks/useLocalData';
import { alertRepository } from '../../repositories/alertRepository';
import { PriorityBadge, EmptyState } from '../shared';
import { cn } from '../../lib/utils';

export function AlertPanel() {
  const alerts = useActiveAlerts() ?? [];
  const hives  = useHives() ?? [];

  const handleResolve = async (id: string) => {
    await alertRepository.resolve(id);
  };

  return (
    <div className="pb-24 space-y-6">
      <div className="flex justify-between items-end px-1">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Alerts</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Active Issues</p>
        </div>
        <button className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-400">
          <Filter className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <EmptyState 
            icon={CheckCircle2} 
            title="All clear" 
            description="No active alerts currently assigned to your path." 
          />
        ) : (
          alerts.map(alert => {
            const hive = hives.find(h => h.id === alert.hiveId);
            return (
              <div 
                key={alert.id}
                className={cn(
                  "bg-white rounded-3xl p-6 shadow-sm border flex flex-col gap-4",
                  alert.priority === 'high' ? "border-red-100" : "border-slate-100"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={alert.priority} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(alert.timestamp), 'HH:mm')}</span>
                  </div>
                  <button onClick={() => handleResolve(alert.id)} className="text-[10px] font-black uppercase text-primary tracking-widest hover:underline">
                    Mark Done
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                    alert.priority === 'high' ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
                  )}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-800 leading-tight mb-2">{alert.message}</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Hexagon className="w-3 h-3" /> {hive?.name ?? 'Hive'}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <MapPin className="w-3 h-3" /> {hive?.apiary ?? 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => handleResolve(alert.id)}
                    className="py-3 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                  </button>
                  <button className="py-3 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" /> Notes
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {alerts.length > 0 && (
        <div className="p-8 text-center opacity-40">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">End of active alerts</p>
        </div>
      )}
    </div>
  );
}
