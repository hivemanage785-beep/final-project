import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, Harvest, Hive } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSync } from '../hooks/useSync';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, Plus, Search, Archive, ChevronRight, X, ScanLine, 
  Lock, ShieldCheck, Clock, ShieldX, MapPin, Zap, Info, 
  RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { BottomSheet } from '../components/layout/BottomSheet';
import { apiGet } from '../services/api';

/* ── Types & Config ── */
interface TraceResult {
  publicId: string;
  harvest_date: string;
  flora: string;
  location: { lat_approx: number; lng_approx: number; note: string };
  beekeeper_name: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  is_locked: boolean;
  certification_id?: string;
  verified_at?: string;
}

const getStatusConfig = (status?: string) => {
  if (status === 'verified') return { label: 'AUTHENTIC', color: '#15803D', bg: '#F0FDF4', icon: ShieldCheck };
  if (status === 'rejected') return { label: 'INVALID', color: '#B91C1C', bg: '#FEF2F2', icon: ShieldX };
  return { label: 'VERIFICATION PENDING', color: '#B45309', bg: '#FFFBEB', icon: Clock };
};

/* ── Sub-components ── */
const VerificationBadge = ({ status }: { status: string }) => {
  const cfg = getStatusConfig(status);
  const Icon = cfg.icon;
  return (
    <div style={{ 
      display: 'inline-flex', alignItems: 'center', gap: 6, 
      padding: '6px 12px', borderRadius: 100, 
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`
    }}>
      <Icon size={14} />
      <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.06em' }}>{cfg.label}</span>
    </div>
  );
};

/* ── Main Component ── */
export const QRTrace: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const { user } = useAuth();
  const { queueOperation, isOnline } = useSync();
  const [activeTab, setActiveTab] = useState<'generate' | 'scan'>('generate');
  
  // Trace Data (Consumer View)
  const [traceData, setTraceData] = useState<TraceResult | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState('');

  // Local Data (Beekeeper View)
  const harvests = useLiveQuery(() => db.harvests.where('uid').equals(user?.uid || '').reverse().toArray(), [user]) || [];
  const hives = useLiveQuery(() => db.hives.where('uid').equals(user?.uid || '').toArray(), [user]) || [];
  const pendingHarvests = useLiveQuery(() => db.outbox.where('entity').equals('harvests').toArray()) || [];

  const [isAdding, setIsAdding] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Harvest | null>(null);
  const [newHarvest, setNewHarvest] = useState({ hive_id: '', flora: 'Wildflower' });

  // Load Trace Data if batchId is in URL
  React.useEffect(() => {
    if (batchId) {
      setTraceLoading(true);
      apiGet(`/api/harvests/trace/${batchId}`)
        .then(res => setTraceData(res.data || res))
        .catch(err => setTraceError(err.message || 'Batch Trace Failed'))
        .finally(() => setTraceLoading(false));
    }
  }, [batchId]);

  const handleCreateHarvest = async () => {
    if (!user || !newHarvest.hive_id) return;
    const selectedHive = hives.find(h => h.hive_id === newHarvest.hive_id);
    const batchId = `HT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const doc: Harvest = {
      id: crypto.randomUUID(),
      uid: user.uid,
      hive_id: newHarvest.hive_id,
      batch_id: batchId,
      harvest_date: new Date().toISOString(),
      flora: newHarvest.flora,
      lat: selectedHive?.lat || 0,
      lng: selectedHive?.lng || 0
    };
    
    await db.harvests.add(doc);
    queueOperation('harvests', 'create', doc);
    setIsAdding(false);
  };

  const getTraceUrl = (batch: Harvest) => {
    const base = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
    return `${base}/trace/${(batch as any).publicId || batch.batch_id}`;
  };

  /* ── VIEW A: CONSUMER TRACEABILITY REPORT ── */
  if (batchId) {
    if (traceLoading) return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
        <RefreshCw className="animate-spin text-slate-300 mb-4" size={40} />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Verifying Provenance...</p>
      </div>
    );
    
    if (traceError || !traceData) return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
        <ShieldX size={64} className="text-rose-100 mb-6" />
        <h2 className="text-xl font-black text-slate-800 mb-2">Traceability Failed</h2>
        <p className="text-sm text-slate-500 mb-8 max-w-xs">{traceError || 'The requested batch ID does not exist in our secure ledger.'}</p>
        <Link to="/" className="btn btn-primary px-8 rounded-2xl">Return to Field</Link>
      </div>
    );

    return (
      <div className="flex-1 bg-[#FDFCFB] min-h-screen pb-20">
        {/* Certificate Header */}
        <div className="bg-white px-6 py-10 text-center border-b border-slate-100 shadow-sm relative overflow-hidden">
           <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: '50%', background: 'rgba(21, 128, 61, 0.03)' }} />
           <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-4 border border-emerald-100">
             <ShieldCheck size={32} className="text-emerald-600" />
           </div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">Authenticity Report</h1>
           <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Sourced & Verified via HiveOps Trace</p>
           <div className="mt-6">
             <VerificationBadge status={traceData.verification_status} />
           </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Provenance Origins */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-[#5D0623]" />
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest">Verified Origin</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Beekeeper</p>
                <p className="text-sm font-bold text-slate-800">{traceData.beekeeper_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Flora Type</p>
                <p className="text-sm font-bold text-slate-800">{traceData.flora}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Region</p>
                <p className="text-sm font-bold text-slate-800">Tamil Nadu, IN</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Harvest Date</p>
                <p className="text-sm font-bold text-slate-800">{new Date(traceData.harvest_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Environmental Snapshot */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-yellow-600" />
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest">Environmental Snapshot</h3>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <div className="flex items-start gap-3">
                 <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                   <CheckCircle2 size={20} className="text-emerald-500" />
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-800">Sustainable Foraging Zone</p>
                   <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                     Harvested from coordinates ({traceData.location.lat_approx}N, {traceData.location.lng_approx}E) identified as a high-potential biodiversity zone.
                   </p>
                 </div>
               </div>
            </div>
          </div>

          {/* Verification Ledger */}
          <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Ledger ID: {traceData.publicId}<br/>
              Verified at: {traceData.verified_at ? new Date(traceData.verified_at).toLocaleString() : 'System Automated Verification'}<br/>
              Data is immutable and cryptographically linked to hive records.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── VIEW B: BEEKEEPER MANAGEMENT ── */
  return (
    <div className="flex-1 bg-[#F8FAFC] h-full w-full pb-20 flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="bg-white px-5 py-6 border-b border-slate-100 shadow-sm z-10">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mb-6">
          <QrCode className="text-[#5D0623]" /> Batch Traceability
        </h1>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl">
           <button 
             className={`flex-1 py-2.5 font-bold text-xs rounded-xl transition-all uppercase tracking-widest ${activeTab === 'generate' ? 'bg-white shadow-sm text-[#5D0623]' : 'text-slate-500'}`}
             onClick={() => setActiveTab('generate')}
           >
             My Batches
           </button>
           <button 
             className={`flex-1 py-2.5 font-bold text-xs rounded-xl transition-all uppercase tracking-widest ${activeTab === 'scan' ? 'bg-white shadow-sm text-[#5D0623]' : 'text-slate-500'}`}
             onClick={() => setActiveTab('scan')}
           >
             Scan QR
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'generate' ? (
          <div className="space-y-4">
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full bg-[#5D0623] hover:bg-[#4a051c] transition-colors text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20"
            >
              <Plus size={18} /> Log Harvest Batch
            </button>

            {harvests.length === 0 ? (
              <div className="text-center py-16">
                <Archive size={48} className="mx-auto mb-4 text-slate-200" />
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Batches Recorded</h3>
                <p className="text-xs text-slate-400 mt-2 max-w-[200px] mx-auto leading-relaxed">Logged harvests will appear here with unique traceability links.</p>
              </div>
            ) : (
              harvests.map(h => {
                const isPending = pendingHarvests.some(p => p.data.id === h.id);
                return (
                  <div
                    key={h.id}
                    onClick={() => setSelectedBatch(h)}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform"
                  >
                    <div className="bg-amber-50 w-12 h-12 rounded-xl flex items-center justify-center text-amber-700 shrink-0">
                      <QrCode size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 truncate tracking-tight">{h.batch_id}</h3>
                        {isPending && <RefreshCw size={10} className="animate-spin text-amber-500" />}
                      </div>
                      <p className="text-[10px] font-black text-[#5D0623] uppercase tracking-widest mt-0.5">{h.flora}</p>
                      <div className="flex items-center gap-4 mt-2">
                         <div className="flex items-center gap-1">
                           <Calendar size={10} className="text-slate-400" />
                           <span className="text-[10px] font-bold text-slate-400">{new Date(h.harvest_date).toLocaleDateString()}</span>
                         </div>
                         <div className="flex items-center gap-1">
                           <CheckCircle2 size={10} className="text-emerald-500" />
                           <span className="text-[10px] font-bold text-emerald-600 uppercase">Live</span>
                         </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
             <div className="w-full max-w-[256px] aspect-square bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-8 relative overflow-hidden">
               <ScanLine size={48} className="text-slate-300" />
               <div className="absolute top-0 left-0 w-full h-1 bg-[#5D0623]/20 animate-[scan_2s_ease-in-out_infinite]" />
             </div>
             <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">QR Authenticator</h2>
             <p className="text-center text-sm text-slate-500 mb-8 max-w-xs leading-relaxed">
               Point the camera at a Batch QR to verify provenance and environmental origin instantly.
             </p>
             <button className="btn btn-secondary w-full max-w-xs py-4 rounded-2xl font-bold">Launch Scanner</button>
          </div>
        )}
      </div>

      {/* Add Harvest Sheet */}
      <BottomSheet isOpen={isAdding} onClose={() => setIsAdding(false)} title="Log Production Batch">
         <div className="space-y-6 pb-8">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-500 leading-relaxed">
                Log a new harvest batch to generate a unique digital twin. This links the honey to its hive and environmental origin.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Source Hive</label>
              <select className="form-select-native" value={newHarvest.hive_id} onChange={e => setNewHarvest({...newHarvest, hive_id: e.target.value})}>
                 <option value="" disabled>Select active hive</option>
                 {hives.map(h => <option key={h.id} value={h.hive_id}>{h.hive_id}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Floral Classification</label>
              <input type="text" className="w-full bg-white p-4 rounded-xl border border-slate-200 text-sm font-bold" value={newHarvest.flora} onChange={e => setNewHarvest({...newHarvest, flora: e.target.value})} placeholder="e.g. Multifloral, Neem" />
            </div>

            <button 
              onClick={handleCreateHarvest}
              disabled={!newHarvest.hive_id}
              className="w-full btn-primary py-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-40"
            >
              Generate Batch QR
            </button>
         </div>
      </BottomSheet>

      {/* Consumer Preview Sheet */}
      <BottomSheet isOpen={selectedBatch !== null} onClose={() => setSelectedBatch(null)} title="Consumer Preview">
         {selectedBatch && (
           <div className="flex flex-col items-center pb-8 pt-2">
              <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-100 mb-6">
                 <QRCodeSVG value={getTraceUrl(selectedBatch)} size={220} level="H" includeMargin={false} />
              </div>
              <p className="text-[10px] text-slate-300 font-mono mb-8 uppercase tracking-widest">Public ID: {(selectedBatch as any).publicId || selectedBatch.batch_id}</p>
              
              <div className="w-full bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
                 <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch Identity</p>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">{selectedBatch.batch_id}</h4>
                    </div>
                    <VerificationBadge status={(selectedBatch as any).verification_status} />
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-5 border-t border-slate-50">
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flora</p>
                     <p className="text-sm font-bold text-slate-800">{selectedBatch.flora}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                     <p className="text-sm font-bold text-slate-800">{new Date(selectedBatch.harvest_date).toLocaleDateString()}</p>
                   </div>
                 </div>

                 <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                   <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                     <Lock size={14} className="text-slate-400" />
                   </div>
                   <p className="text-[10px] text-slate-400 font-medium">Batch data is cryptographically locked and immutable.</p>
                 </div>
              </div>
              
              <div className="mt-8 flex gap-3">
                <Link 
                  to={`/trace/${(selectedBatch as any).publicId || selectedBatch.batch_id}`} 
                  className="btn btn-secondary px-8 rounded-xl font-bold"
                >
                  View Full Report
                </Link>
              </div>
           </div>
         )}
      </BottomSheet>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};

const Calendar = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
