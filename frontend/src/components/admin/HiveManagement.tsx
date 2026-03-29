/**
 * Hive Management — table + map toggle, filters, search, bulk actions
 */
import React, { useState, useMemo } from 'react';
import {
  Search, Filter, MapPin, Table2, ChevronRight,
  Hexagon, AlertTriangle,
} from 'lucide-react';
import { HealthBadge, HealthRing, EmptyState } from '../shared';
import { useHives } from '../../hooks/useLocalData';
import type { AdminView } from './AdminLayout';

type HiveFilterStatus = 'all' | 'active' | 'harvested' | 'relocated';

interface HiveManagementProps {
  onNavigate: (view: AdminView, id?: string) => void;
}

export function HiveManagement({ onNavigate }: HiveManagementProps) {
  const hives          = useHives() ?? [];
  const [viewMode, setViewMode]     = useState<'table' | 'map'>('table');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState<HiveFilterStatus>('all');
  const [healthFilter, setHealth]   = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [selected, setSelected]     = useState<Set<string>>(new Set());

  const filtered = useMemo(() => hives.filter((h) => {
    if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.id.includes(search)) return false;
    if (statusFilter !== 'all' && h.status !== statusFilter) return false;
    if (healthFilter === 'healthy'  && h.health < 80) return false;
    if (healthFilter === 'warning'  && (h.health >= 80 || h.health < 50)) return false;
    if (healthFilter === 'critical' && h.health >= 50) return false;
    return true;
  }), [hives, search, statusFilter, healthFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((h) => h.id)));
  const clearSel  = () => setSelected(new Set());

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Hive Management</h1>
          <p className="text-sm text-slate-500">{hives.length} hives total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('table')} className={`p-2 rounded-xl border ${viewMode === 'table' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-500'}`}>
            <Table2 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('map')} className={`p-2 rounded-xl border ${viewMode === 'map' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-500'}`}>
            <MapPin className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hive name or ID…"
            className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value as HiveFilterStatus)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none cursor-pointer">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="harvested">Harvested</option>
          <option value="relocated">Relocated</option>
        </select>
        <select value={healthFilter} onChange={(e) => setHealth(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none cursor-pointer">
          <option value="all">All Health</option>
          <option value="healthy">Healthy (≥80%)</option>
          <option value="warning">Warning (50–79%)</option>
          <option value="critical">Critical (&lt;50%)</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-4">
          <span className="text-sm font-bold text-primary">{selected.size} selected</span>
          <button className="text-xs font-semibold text-slate-600 hover:text-slate-800">Bulk Update Status</button>
          <button className="text-xs font-semibold text-slate-600 hover:text-slate-800">Bulk Assign</button>
          <button onClick={clearSel} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Clear</button>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={Hexagon} title="No hives found" description="Try adjusting your filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left w-8">
                      <input type="checkbox" onChange={(e) => e.target.checked ? selectAll() : clearSel()}
                        checked={selected.size === filtered.length && filtered.length > 0}
                        className="rounded accent-primary cursor-pointer" />
                    </th>
                    <th className="px-4 py-3 text-left">Hive</th>
                    <th className="px-4 py-3 text-left">Apiary</th>
                    <th className="px-4 py-3 text-left">Health</th>
                    <th className="px-4 py-3 text-left">Temp</th>
                    <th className="px-4 py-3 text-left">Humidity</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((hive) => (
                    <tr key={hive.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(hive.id)}
                          onChange={() => toggleSelect(hive.id)}
                          className="rounded accent-primary cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-700">{hive.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{hive.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{hive.apiary}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <HealthBadge health={hive.health} />
                          <span className="font-mono text-xs text-slate-600">{hive.health}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{hive.temp}°C</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{hive.humidity}%</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          hive.status === 'active'    ? 'bg-green-100 text-green-700' :
                          hive.status === 'harvested' ? 'bg-primary/10 text-primary'  :
                                                        'bg-slate-100 text-slate-600'
                        }`}>{hive.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => onNavigate('hive-detail', hive.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-primary">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="relative h-[60vh] bg-slate-50">
            {/* Grid dot pattern for map background */}
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '28px 28px' }}
            />
            <div className="absolute inset-0 p-4">
              {filtered.map((hive, i) => (
                <button
                  key={hive.id}
                  onClick={() => onNavigate('hive-detail', hive.id)}
                  className="absolute group"
                  style={{ left: `${15 + (i * 13) % 65}%`, top: `${15 + (i * 17) % 65}%` }}
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform group-hover:scale-110 ${
                      hive.health >= 80 ? 'bg-green-500' :
                      hive.health >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}>
                      <Hexagon className="w-5 h-5 text-white fill-current" />
                    </div>
                    {hive.health < 50 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white">
                        <AlertTriangle className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                      <div className="bg-slate-900 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-xl">
                        {hive.name} · {hive.health}%
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-slate-100 space-y-1.5">
              {[
                { color: 'bg-green-500', label: 'Healthy (≥80%)' },
                { color: 'bg-amber-500', label: 'Warning (50–79%)' },
                { color: 'bg-red-500',   label: 'Critical (<50%)' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-[10px] text-slate-600 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
