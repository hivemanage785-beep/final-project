/**
 * Beekeeper MapView — Interactive hive map with health overlays
 */
import React, { useState } from 'react';
import { 
  Map as MapIcon, Layers, Navigation, 
  MapPin, Hexagon, Search, X,
  Compass, Maximize2, Crosshair
} from 'lucide-react';
import { useHives } from '../../hooks/useLocalData';
import { cn } from '../../lib/utils';
import { HealthBadge } from '../shared';

interface MapViewProps {
  onSelectHive: (id: string) => void;
}

export function MapView({ onSelectHive }: MapViewProps) {
  const hives = useHives() ?? [];
  const [activeHiveId, setActiveHiveId] = useState<string | null>(null);
  
  const activeHive = hives.find(h => h.id === activeHiveId);

  return (
    <div className="fixed inset-0 top-[72px] bottom-20 bg-slate-50 overflow-hidden">
      {/* Search Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-2xl border border-white shadow-xl px-4 py-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input placeholder="Search apiary location..." className="flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none" />
          <div className="h-4 w-px bg-slate-200 mx-2" />
          <Layers className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Mock Map Background (SVG Grid) */}
      <div className="absolute inset-0 preserve-3d">
        <div className="absolute inset-0 bg-[#f8fafc]"
          style={{ 
            backgroundImage: `
              linear-gradient(to right, #e2e8f0 1px, transparent 1px),
              linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
        {/* Terrain/River mock shapes */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
          <path d="M-100,200 Q150,150 300,400 T800,200" fill="none" stroke="#0ea5e9" strokeWidth="80" strokeLinecap="round" />
        </svg>

        {/* Hive Markers */}
        {hives.map((hive, i) => (
          <button
            key={hive.id}
            onClick={() => setActiveHiveId(hive.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform active:scale-95"
            style={{ 
              left: `${20 + (i * 15) % 80}%`, 
              top: `${20 + (i * 22) % 65}%` 
            }}
          >
            <div className={cn(
              "w-12 h-12 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all",
              hive.health >= 80 ? "bg-green-500" : hive.health >= 50 ? "bg-amber-500" : "bg-red-500",
              activeHiveId === hive.id ? "scale-125 ring-4 ring-primary/20" : "scale-100"
            )}>
              <Hexagon className="w-6 h-6 text-white fill-current" />
            </div>
          </button>
        ))}
      </div>

      {/* Map Controls */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-2">
        {[Maximize2, Compass, Navigation].map((Icon, idx) => (
          <button key={idx} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white flex items-center justify-center text-slate-600 active:scale-90 transition-transform">
            <Icon className="w-5 h-5" />
          </button>
        ))}
        <button className="w-10 h-10 bg-primary rounded-xl shadow-lg flex items-center justify-center text-white active:scale-90 transition-transform">
          <Crosshair className="w-5 h-5" />
        </button>
      </div>

      {/* Active Selection Bottom Sheet (Mini) */}
      {activeHive && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                <Hexagon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-800 leading-tight">{activeHive.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeHive.apiary}</p>
                <div className="flex items-center gap-2 mt-1">
                  <HealthBadge health={activeHive.health} size="sm" />
                  <span className="text-[10px] font-black text-slate-500">{activeHive.health}% Health</span>
                </div>
              </div>
            </div>
            <button onClick={() => setActiveHiveId(null)} className="p-1 bg-slate-50 rounded-lg">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => onSelectHive(activeHive.id)}
              className="flex-1 py-3.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20"
            >
              Open Hive
            </button>
            <button className="flex-1 py-3.5 bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest rounded-2xl">
              Directions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
