/**
 * Harvest & Traceability — View all harvest batches and audit trails
 */
import React, { useState } from 'react';
import { 
  FlaskConical, Search, Filter, Calendar, 
  MapPin, Hexagon, ShieldCheck, Download,
  Fingerprint, ChevronRight, FileText, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { useHarvests, useHive } from '../../hooks/useLocalData';
import { EmptyState, KPICard } from '../shared';
import type { AdminView } from './AdminLayout';

interface HarvestTraceabilityProps {
  onNavigate: (view: AdminView, id?: string) => void;
  selectedBatchId?: string;
}

export function HarvestTraceability({ onNavigate, selectedBatchId }: HarvestTraceabilityProps) {
  const harvests = useHarvests() ?? [];
  const [search, setSearch] = useState('');
  const [floraFilter, setFlora] = useState('all');

  const selectedHarvest = harvests.find(h => h.id === selectedBatchId);
  const sourceHive = useHive(selectedHarvest?.hiveId ?? '');

  const filteredHarvests = harvests.filter(h => {
    if (search && !h.batchId.toLowerCase().includes(search.toLowerCase()) && !h.apiary.toLowerCase().includes(search.toLowerCase())) return false;
    if (floraFilter !== 'all' && h.floraType !== floraFilter) return false;
    return true;
  });

  const floraTypes = Array.from(new Set(harvests.map(h => h.floraType)));

  if (selectedBatchId && selectedHarvest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('harvests')}
            className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <h1 className="text-2xl font-black text-slate-800">Batch Traceability</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="relative h-64 bg-slate-900 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1587049633562-ad3552a39c5e?auto=format&fit=crop&q=80&w=1200" 
                  className="w-full h-full object-cover opacity-60"
                  alt="Honey Harvest"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 flex items-end justify-between right-6">
                  <div>
                    <h2 className="text-3xl font-black text-white leading-none">{selectedHarvest.floraType}</h2>
                    <p className="text-sm text-slate-300 mt-1 uppercase font-bold tracking-widest">Heritage Verified Batch</p>
                  </div>
                  <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl flex items-center gap-2 border border-primary/20 shadow-xl">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <span className="text-xs font-black text-primary uppercase tracking-widest">Heritage Verified</span>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-3 gap-6 py-6 border-b border-slate-50">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Batch ID</p>
                    <p className="text-sm font-black text-slate-800 font-mono tracking-tighter">{selectedHarvest.batchId}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Quantity</p>
                    <p className="text-sm font-black text-primary">{selectedHarvest.quantity}kg</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Purity</p>
                    <p className="text-sm font-black text-green-600">{selectedHarvest.purity}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Extraction Data</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-700">Moisture Content</span>
                        <span className="text-[11px] font-mono font-bold text-slate-500">{selectedHarvest.moisture}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-700">Terroir Profile</span>
                        <span className="text-[11px] font-bold text-slate-500">{selectedHarvest.terroir}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Blockchain Stamp</p>
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-primary" />
                      <code className="text-[9px] font-mono text-primary font-bold break-all">
                        {selectedHarvest.hash.slice(0, 16)}...
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Harvest Notes
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed italic">
                Extraction performed at {selectedHarvest.apiary}. Wildflower profile dominated by lavender and heather. Moisture levels optimal for long-term storage. Digitally signed and verified by master apiarist.
              </p>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Origin
              </h3>
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <Hexagon className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{selectedHarvest.apiary}</p>
                  <p className="text-[11px] text-slate-500 font-semibold">{sourceHive?.name ?? 'Unknown Hive'}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-1">HIVE_REF: {selectedHarvest.hiveId}</p>
                </div>
              </div>
              <div className="h-40 bg-slate-50 rounded-xl overflow-hidden relative">
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '12px 12px' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Micro-Terroir Coordinates</p>
                    <p className="text-[10px] font-mono font-bold text-primary">37.7749° N, 122.4194° W</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <button className="w-full py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Export Quality Report (PDF)
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Harvests & Traceability</h1>
          <p className="text-sm text-slate-500">{harvests.length} total harvest entries</p>
        </div>
        <button className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard label="Total Honey kg" value={harvests.reduce((s, h) => s + h.quantity, 0).toFixed(1)} icon={FlaskConical} />
        <KPICard label="Unique Batches" value={harvests.length} icon={ShieldCheck} color="green" />
        <KPICard label="Avg Purity" value={`${(harvests.reduce((s, h) => s + h.purity, 0) / (harvests.length || 1)).toFixed(1)}%`} icon={FlaskConical} color="amber" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input 
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by batch ID or apiary…" 
            className="flex-1 text-sm outline-none bg-transparent"
          />
        </div>
        <select value={floraFilter} onChange={(e) => setFlora(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none">
          <option value="all">All Flora Types</option>
          {floraTypes.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredHarvests.length === 0 ? (
          <EmptyState icon={FlaskConical} title="No harvests found" description="Adjust your filters or record a new harvest." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Batch ID</th>
                  <th className="px-5 py-3 text-left">Apiary</th>
                  <th className="px-5 py-3 text-left">Flora Type</th>
                  <th className="px-5 py-3 text-left">Quantity</th>
                  <th className="px-5 py-3 text-left">Harvest Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHarvests.sort((a, b) => b.timestamp - a.timestamp).map((harvest) => (
                  <tr 
                    key={harvest.id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onNavigate('harvest-detail', harvest.id)}
                  >
                    <td className="px-5 py-4 font-mono font-bold text-slate-600 text-[11px] tracking-tighter">
                      {harvest.batchId}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">{harvest.apiary}</td>
                    <td className="px-5 py-4 text-slate-500 font-medium">{harvest.floraType ?? 'Wildflower'}</td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-black text-primary">{harvest.quantity}kg</span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 font-medium">
                      {format(new Date(harvest.timestamp), 'dd MMM yyyy')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ChevronRight className="w-4 h-4 ml-auto text-slate-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
