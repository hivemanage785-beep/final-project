import React, { useState, useMemo } from 'react';
import { Plus, Hexagon, Wifi, WifiOff, RefreshCw, AlertCircle, Filter } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Hive } from '../lib/db';
import { useSync } from '../hooks/useSync';
import { useAuth } from '../hooks/useAuth';
import { HiveCard } from '../components/cards/HiveCard';
import { AddHiveSheet } from '../modules/hives/AddHiveSheet';
import { AddLogSheet } from '../modules/hives/AddLogSheet';
import { HiveDetailsSheet } from '../modules/hives/HiveDetailsSheet';
import QRCodeCard from '../components/common/QRCodeCard';
import { 
  OperationalSkeleton, OperationalEmptyState 
} from '../components/states/OperationalUI';
import { isOverdue } from '../utils/isOverdue';

export const HivesPage = () => {
  const { user } = useAuth();
  const { isOnline, isSyncing } = useSync();
  const pendingCount = useLiveQuery(() => db.outbox.count()) || 0;

  // Live query for hives with reactive updates
  const hives = useLiveQuery(
    () => db.hives.where('uid').equals(user?.uid || '').toArray(),
    [user]
  ) || [];

  const [filter, setFilter] = useState<'all' | 'good' | 'fair' | 'poor'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [logTarget, setLogTarget] = useState<Hive | null>(null);
  const [detailTarget, setDetailTarget] = useState<Hive | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Operational sorting: Overdue first, then Poor Health, then Most Recent
  const processedHives = useMemo(() => {
    let list = filter === 'all' ? [...hives] : hives.filter(h => h.health_status === filter);
    
    return list.sort((a, b) => {
      const aOverdue = isOverdue(a.last_inspection_date);
      const bOverdue = isOverdue(b.last_inspection_date);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      const aPoor = a.health_status === 'poor';
      const bPoor = b.health_status === 'poor';
      if (aPoor && !bPoor) return -1;
      if (!aPoor && bPoor) return 1;
      
      return new Date(b.last_inspection_date).getTime() - new Date(a.last_inspection_date).getTime();
    });
  }, [hives, filter]);

  const counts = {
    all: hives.length,
    good: hives.filter(h => h.health_status === 'good').length,
    fair: hives.filter(h => h.health_status === 'fair').length,
    poor: hives.filter(h => h.health_status === 'poor').length,
  };

  return (
    <div className="page-enter">
      {/* Operational Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Hives</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Monitoring {hives.length} active apiary units</p>
        </div>
      </div>

      {hives.length > 0 && (
        <div className="mb-8">
          <div className="bg-slate-100/50 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(['all', 'good', 'fair', 'poor'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                  filter === f 
                    ? 'bg-white shadow-sm text-[#5D0623]' 
                    : 'text-slate-400'
                }`}
              >
                {f}
                <span className={`opacity-60 ${filter === f ? 'text-[#5D0623]' : 'text-slate-400'}`}>{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Critical Status Banner */}
      {counts.poor > 0 && filter === 'all' && (
        <div className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-4 mb-8 flex items-start gap-3 animate-in slide-in-from-top duration-500">
          <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest">Operational Alert</p>
            <p className="text-[12px] text-rose-700 font-medium leading-tight mt-1">
              {counts.poor} colony units require immediate medical intervention or nutritional support.
            </p>
          </div>
        </div>
      )}

      {/* Hive List */}
      <div className="flex flex-col gap-5">
        {hives === undefined ? (
          <OperationalSkeleton rows={4} type="card" />
        ) : hives.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center mt-4 shadow-sm flex flex-col items-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Hexagon size={28} className="text-slate-400" strokeWidth={2} />
             </div>
             <p className="text-base text-slate-800 font-semibold mb-2">No Hives Yet</p>
             <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed">
               Add your first hive to start tracking health and production.
             </p>
          </div>
        ) : processedHives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Filter size={24} className="opacity-30 mb-2" />
            <p className="text-sm font-semibold text-slate-500">No hives match '{filter}' filter</p>
          </div>
        ) : (
          processedHives.map(h => (
            <HiveCard 
              key={h.id} 
              hive={h} 
              onLog={setLogTarget} 
              onMove={setDetailTarget} // Move tab is in details
              onDetails={setDetailTarget}
              onTrace={(id) => setSelectedBatchId(id)}
            />
          ))
        )}
      </div>

      {/* Trace Modal Placeholder */}
      {selectedBatchId && (
        <div onClick={() => setSelectedBatchId(null)} className="fixed inset-0 z-[5000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-5">
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <QRCodeCard batchId={selectedBatchId} />
            <button onClick={() => setSelectedBatchId(null)} className="w-full bg-slate-100 text-slate-700 py-3.5 rounded-xl font-semibold text-sm mt-5 active:scale-[0.98] transition-transform">Close</button>
          </div>
        </div>
      )}

      {/* Fixed FAB for mobile reachability */}
      <button 
        onClick={() => setIsAddOpen(true)} 
        className="fixed bottom-[5.5rem] right-5 w-14 h-14 bg-[#5D0623] text-white rounded-full shadow-lg shadow-rose-900/20 flex items-center justify-center active:scale-95 transition-transform z-50"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Sheets */}
      <AddHiveSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={() => {}} // useLiveQuery handles updates
      />

      <AddLogSheet
        isOpen={!!logTarget}
        hiveId={logTarget?.id || ''}
        hiveName={logTarget?.hive_id || ''}
        onClose={() => setLogTarget(null)}
        onAdded={() => {}} // useLiveQuery handles updates
      />

      <HiveDetailsSheet 
        hive={detailTarget}
        isOpen={!!detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </div>
  );
};

