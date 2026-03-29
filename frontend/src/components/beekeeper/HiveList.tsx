/**
 * Beekeeper Hive List — Color-coded grid for field identification
 */
import React, { useState } from 'react';
import { 
  Search, Filter, Hexagon, MapPin, 
  Thermometer, Droplets, ChevronRight,
  TrendingUp, TrendingDown, ClipboardList
} from 'lucide-react';
import { useHives } from '../../hooks/useLocalData';
import { HealthBadge, EmptyState } from '../shared';
import { cn } from '../../lib/utils';

interface HiveListProps {
  onSelect: (id: string) => void;
}

export function HiveList({ onSelect }: HiveListProps) {
  const hives = useHives() ?? [];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unhealthy' | 'harvestable'>('all');

  const filteredHives = hives.filter(h => {
    if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.apiary.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'unhealthy' && h.health >= 70) return false;
    if (filter === 'harvestable' && h.status !== 'active') return false; // Mock logic
    return true;
  });

  return (
    <div className="pb-24 space-y-5">
      <div className="">
        <h1 className="text-2xl font-black text-slate-800">Your Hives</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Field Inventory</p>
      </div>

      {/* Search & Filter Pills */}
      <div className="sticky top-[72px] z-30 bg-slate-50/95 backdrop-blur-sm py-2 space-y-3">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm">
          <Search className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <input 
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Find hive by name or location…" 
            className="flex-1 text-sm font-semibold outline-none bg-transparent text-slate-700"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'unhealthy', 'harvestable'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all",
                filter === f 
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg" 
                  : "bg-white text-slate-500 border-slate-100 shadow-sm"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Hive Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredHives.length === 0 ? (
          <EmptyState icon={Hexagon} title="No hives found" description="Try broadening your search." />
        ) : (
          filteredHives.map(hive => (
            <button 
              key={hive.id}
              onClick={() => onSelect(hive.id)}
              className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border",
                    hive.health >= 80 ? "bg-green-50 text-green-600 border-green-100" :
                    hive.health >= 50 ? "bg-amber-50 text-amber-500 border-amber-100" :
                                      "bg-red-50 text-red-500 border-red-100"
                  )}>
                    <Hexagon className="w-6 h-6 fill-current" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 leading-tight">{hive.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{hive.apiary}</p>
                  </div>
                </div>
                <div className="text-right">
                  <HealthBadge health={hive.health} size="md" />
                  <p className="text-[10px] font-mono font-black text-slate-500 mt-1">{hive.health}%</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0 border-t border-slate-50 pt-3">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-slate-500 mb-0.5">
                    <Thermometer className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Temp</span>
                  </div>
                  <p className="text-xs font-black text-slate-700 font-mono tracking-tighter">{hive.temp}°C</p>
                </div>
                <div className="flex flex-col items-center border-x border-slate-50">
                  <div className="flex items-center gap-1 text-slate-500 mb-0.5">
                    <Droplets className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Humid</span>
                  </div>
                  <p className="text-xs font-black text-slate-700 font-mono tracking-tighter">{hive.humidity}%</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-slate-500 mb-0.5">
                    <ClipboardList className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Visit</span>
                  </div>
                  <p className="text-xs font-black text-slate-700 font-mono tracking-tighter">2d ago</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
