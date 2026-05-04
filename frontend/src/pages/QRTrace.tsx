import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, Harvest } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSync } from '../hooks/useSync';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Plus, Search, Archive, ChevronRight, X, ScanLine, Lock, ShieldCheck, Clock, ShieldX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomSheet } from '../components/BottomSheet';

import { useParams } from 'react-router-dom';
import { apiGet } from '../services/api';

export const QRTrace: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const { user } = useAuth();
  const { queueOperation } = useSync();
  const [activeTab, setActiveTab] = useState<'generate' | 'scan'>('generate');
  const [traceData, setTraceData] = useState<any>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState('');

  React.useEffect(() => {
    if (batchId) {
      setTraceLoading(true);
      apiGet(`/api/harvests/trace/${batchId}`)
        .then(data => setTraceData(data))
        .catch(err => setTraceError(err.message || 'Trace not found'))
        .finally(() => setTraceLoading(false));
    }
  }, [batchId]);
  
  const harvests = useLiveQuery(() => db.harvests.where('uid').equals(user?.uid || '').reverse().toArray(), [user]) || [];
  const hives = useLiveQuery(() => db.hives.where('uid').equals(user?.uid || '').toArray(), [user]) || [];
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Harvest | null>(null);
  
  const [newHarvest, setNewHarvest] = useState({
    hive_id: '',
    flora: 'Wildflower',
  });

  const handleCreateHarvest = async () => {
    if (!user || !newHarvest.hive_id) return;
    
    const selectedHive = hives.find(h => h.hive_id === newHarvest.hive_id);
    const batchId = `BATCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const uid = user.uid;
    const harvestData: Harvest = {
      id: crypto.randomUUID(), // Required: Dexie uses 'id' as non-auto PK
      uid: uid,
      hive_id: newHarvest.hive_id,
      batch_id: batchId,
      harvest_date: new Date().toISOString(),
      flora: newHarvest.flora,
      lat: selectedHive?.lat || 0,
      lng: selectedHive?.lng || 0
    };
    
    await db.harvests.add(harvestData);
    queueOperation('harvests', 'create', harvestData);
    console.log('[HARVEST] Batch created locally:', batchId);
    setIsAdding(false);
  };


  const getTraceUrl = (batch: Harvest) => {
    const base = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
    // Use publicId from backend if synced, else fall back to batch_id
    return `${base}/trace/${(batch as any).publicId || batch.batch_id}`;
  };

  const getStatusConfig = (status?: string) => {
    if (status === 'verified') return { label: 'Verified', color: 'text-emerald-600 bg-emerald-50', icon: ShieldCheck };
    if (status === 'rejected') return { label: 'Rejected', color: 'text-red-600 bg-red-50', icon: ShieldX };
    return { label: 'Pending', color: 'text-amber-600 bg-amber-50', icon: Clock };
  };

  if (batchId) {
    if (traceLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading trace data...</div>;
    if (traceError) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{traceError}</div>;
    if (!traceData) return null;
    
    return (
      <div className="flex-1 bg-gray-50 h-full w-full pb-20 flex flex-col overflow-y-auto">
        <div className="bg-white px-4 py-6 border-b border-gray-100 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Traceability Report</h1>
          <p className="text-sm text-gray-500">Batch: {batchId}</p>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-lg mb-4 text-[#5D0623]">Harvest Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Flora</p>
                <p className="font-bold">{traceData.flora || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-bold">{traceData.harvest_date ? new Date(traceData.harvest_date).toLocaleDateString() : 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Beekeeper</p>
                <p className="font-bold">{traceData.beekeeper_name || 'Partner Beekeeper'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-bold">{(traceData.location?.lat_approx || traceData.lat)?.toFixed(2)} N, {(traceData.location?.lng_approx || traceData.lng)?.toFixed(2)} E</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-600">
                This data is recorded by the beekeeper and supported by environmental analysis. It improves transparency but does not guarantee authenticity.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 h-full w-full pb-20 flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 shadow-sm z-10">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4 mt-2">
          <QrCode className="text-primary-600" /> Traceability
        </h1>
        
        <div className="flex bg-gray-100 p-1 rounded-xl">
           <button 
             className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all ${activeTab === 'generate' ? 'bg-white shadow-sm text-[#5D0623]' : 'text-gray-500 hover:text-gray-700'}`}
             onClick={() => setActiveTab('generate')}
           >
             My Harvests
           </button>
           <button 
             className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all ${activeTab === 'scan' ? 'bg-white shadow-sm text-[#5D0623]' : 'text-gray-500 hover:text-gray-700'}`}
             onClick={() => setActiveTab('scan')}
           >
             Scan & Verify
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'generate' ? (
            <motion.div key="gen" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
              
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full bg-[#5D0623]/10 border border-[#5D0623]/20 hover:bg-[#5D0623]/20 transition-colors text-[#5D0623] font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Log New Harvest
              </button>

              {harvests.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Archive size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No harvests recorded yet.</p>
                </div>
              ) : (
                harvests.map(h => {
                  const statusCfg = getStatusConfig((h as any).verification_status);
                  const StatusIcon = statusCfg.icon;
                  return (
                    <div
                      key={h.id}
                      onClick={() => setSelectedBatch(h)}
                      className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform"
                    >
                      <div className="bg-orange-50 w-12 h-12 rounded-xl flex items-center justify-center text-orange-600 relative">
                        <QrCode size={24} />
                        {(h as any).is_locked && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 rounded-full flex items-center justify-center">
                            <Lock size={9} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{h.batch_id}</h3>
                        <p className="text-xs font-semibold text-[#5D0623] uppercase tracking-wider">{h.flora}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(h.harvest_date).toLocaleDateString()}</p>
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${statusCfg.color}`}>
                        <StatusIcon size={10} />{statusCfg.label}
                      </span>
                    </div>
                  );
                })
              )}

            </motion.div>
          ) : (
            <motion.div key="scn" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col items-center justify-center py-8">
               <div className="w-64 h-64 bg-gray-200/50 rounded-3xl border-4 border-dashed border-gray-300 flex items-center justify-center mb-6 relative overflow-hidden">
                 <ScanLine size={48} className="text-gray-400 absolute" />
                 <div className="absolute top-0 left-0 w-full h-1 bg-green-400/50 blur-[2px] animate-[scan_2s_ease-in-out_infinite]" />
               </div>
               
               <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Scan Batch QR</h2>
               <p className="text-center text-sm text-gray-500 mb-8 max-w-xs">
                 Align the Honey jar QR code within the frame to verify its authenticity.
               </p>
               
               <button 
                 onClick={() => {
                   if (harvests[0]) setSelectedBatch(harvests[0]);
                   else alert("No mock local data available to simulate scan. Please create a harvest first.");
                 }}
                 className="bg-white border-2 border-[#5D0623] text-[#5D0623] font-bold py-3 px-8 rounded-xl shadow-sm"
               >
                 Simulate Successful Scan
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Harvest Sheet */}
      <BottomSheet isOpen={isAdding} onClose={() => setIsAdding(false)} title="Log Harvest">
         <div className="space-y-4 pb-8">
            <div className="space-y-1 mt-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Select Hive</label>
              <select className="input-field" value={newHarvest.hive_id} onChange={e => setNewHarvest({...newHarvest, hive_id: e.target.value})}>
                 <option value="" disabled>Select a hive</option>
                 {hives.map(h => <option key={h.id} value={h.hive_id}>{h.hive_id}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Floral Source</label>
              <input type="text" className="input-field" value={newHarvest.flora} onChange={e => setNewHarvest({...newHarvest, flora: e.target.value})} />
            </div>

            <button 
              onClick={handleCreateHarvest}
              disabled={!newHarvest.hive_id}
              className="w-full btn-primary mt-4 disabled:bg-gray-300"
            >
              Generate Batch QR
            </button>
         </div>
      </BottomSheet>

      {/* View Batch Details Sheet (Public View Simulator) */}
      <BottomSheet isOpen={selectedBatch !== null} onClose={() => setSelectedBatch(null)} title="Consumer Traceability">
         {selectedBatch && (
           <div className="flex flex-col items-center pb-8 pt-2">
              <p className="text-sm text-gray-600 text-center mb-4 px-4">This batch is linked to its hive and location data, allowing verification of honey origin and authenticity.</p>
              <div className="bg-white p-4 rounded-3xl shadow-lg border border-gray-100 mb-6">
                 <QRCodeSVG value={getTraceUrl(selectedBatch)} size={200} level="H" includeMargin={true} />
              </div>
              <p className="text-xs text-gray-400 font-mono mb-4">{getTraceUrl(selectedBatch)}</p>
              
              <div className="w-full bg-[#fcf9f6] rounded-2xl p-5 border border-[#5D0623]/10 space-y-4 relative overflow-hidden">
                 <div className="flex justify-between items-start">
                   <div>
                     <p className="text-[10px] uppercase font-bold tracking-widest text-[#5D0623]">Batch Code</p>
                     <p className="text-xl font-black text-gray-900 tracking-tight">{selectedBatch.batch_id}</p>
                   </div>
                   {(() => {
                     const cfg = getStatusConfig((selectedBatch as any).verification_status);
                     const Icon = cfg.icon;
                     return (
                       <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.color}`}>
                         <Icon size={14} /> {cfg.label}
                       </span>
                     );
                   })()}
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#5D0623]/10">
                   <div>
                     <p className="text-xs text-gray-500 font-medium">Source Flora</p>
                     <p className="font-bold text-gray-900">{selectedBatch.flora}</p>
                   </div>
                   <div>
                     <p className="text-xs text-gray-500 font-medium">Harvest Date</p>
                     <p className="font-bold text-gray-900">{new Date(selectedBatch.harvest_date).toLocaleDateString()}</p>
                   </div>
                   <div className="col-span-2">
                     <p className="text-xs text-gray-500 font-medium">Beekeeper / Apiary</p>
                     <p className="font-bold text-gray-900">{user?.displayName || 'Partner Beekeeper'}</p>
                     {/* Location intentionally NOT shown to consumer — privacy policy */}
                     <p className="text-[10px] text-gray-300 mt-0.5">Location: approximate region only</p>
                   </div>
                 </div>

                 {(selectedBatch as any).is_locked && (
                   <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-2 border-t border-[#5D0623]/10">
                     <Lock size={10} />
                     Batch locked · Data immutable
                   </div>
                 )}
              </div>
              <p className="text-xs text-gray-500 text-center mt-4 px-4">All information is derived from recorded hive data and verified system records.</p>
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
