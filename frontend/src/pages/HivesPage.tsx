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

const isOverdue = (date?: string) => {
  if (!date) return true;
  const diff = (new Date().getTime() - new Date(date).getTime()) / (1000 * 3600 * 24);
  return diff > 14;
};

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
      <div className="flex items-center justify-between mb-8 pt-2 px-1">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Hives</h1>
          <p className="text-[15px] text-slate-400 font-medium mt-0.5">{hives.length} active apiaries</p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="w-12 h-12 shrink-0 flex items-center justify-center bg-[#9b0a00] text-white rounded-[16px] shadow-sm active:scale-95 transition-transform">
          <Plus size={24} />
        </button>
      </div>

      {/* Quick Filters & Operational Density */}
      {hives.length > 0 && (
        <div className="mb-7">
          <div className="bg-slate-50/50 rounded-3xl p-3 border border-slate-100 flex items-center gap-3 overflow-x-auto no-scrollbar">
            {(['all', 'good', 'fair', 'poor'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                  filter === f 
                    ? 'bg-[#9b0a00] text-white shadow-md shadow-rose-900/20' 
                    : 'bg-white text-slate-500 border border-slate-100'
                }`}
              >
                {f}
                <span className={`opacity-60 ${filter === f ? 'text-rose-100' : 'text-slate-400'}`}>{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Critical Status Banner */}
      {counts.poor > 0 && filter === 'all' && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 mb-6 flex items-start gap-3 animate-in slide-in-from-top duration-500">
          <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-black text-rose-900 uppercase tracking-widest">Operational Alert</p>
            <p className="text-[12px] text-rose-700 font-medium leading-tight mt-0.5">
              {counts.poor} colony units require immediate medical intervention or nutritional support.
            </p>
          </div>
        </div>
      )}

      {/* Hive List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {hives === undefined ? (
          <OperationalSkeleton rows={4} type="card" />
        ) : hives.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-dashed border-slate-200 p-12 text-center mt-4">
             <p className="text-[16px] text-slate-800 font-medium leading-relaxed">
               No hives added yet. Add your first<br />hive to begin.
             </p>
          </div>
        ) : processedHives.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
            <Filter size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p style={{ fontSize: 13, fontWeight: 600 }}>No hives match '{filter}' filter</p>
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
        <div onClick={() => setSelectedBatchId(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 }}>
            <QRCodeCard batchId={selectedBatchId} />
            <button onClick={() => setSelectedBatchId(null)} className="btn btn-secondary btn-full" style={{ marginTop: 20, borderRadius: 12 }}>Close</button>
          </div>
        </div>
      )}

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

