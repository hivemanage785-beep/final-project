/**
 * Hive Detail — Health metrics, inspection history, harvest history
 */
import React from 'react';
import { 
  ArrowLeft, Calendar, Clock, Thermometer, Droplets, 
  Search, FlaskConical, ClipboardList, MapPin, 
  User, ShieldCheck, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { HealthBadge, HealthRing, KPICard, EmptyState } from '../shared';
import { 
  useHive, 
  useInspectionsByHive, 
  useHarvestsByHive 
} from '../../hooks/useLocalData';
import type { AdminView } from './AdminLayout';

interface HiveDetailProps {
  hiveId: string;
  onBack: () => void;
  onNavigate: (view: AdminView, id?: string) => void;
}

export function HiveDetail({ hiveId, onBack, onNavigate }: HiveDetailProps) {
  const hive        = useHive(hiveId);
  const inspections = useInspectionsByHive(hiveId) ?? [];
  const harvests    = useHarvestsByHive(hiveId) ?? [];

  if (!hive) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <EmptyState 
          icon={Search} 
          title="Hive not found" 
          description="The hive you are looking for does not exist or has been deleted." 
          action={{ label: 'Back to Hives', onClick: onBack }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800">{hive.name}</h1>
          <p className="text-sm text-slate-500 font-mono">{hive.id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
            hive.status === 'active' ? 'bg-green-100 text-green-700' : 
            hive.status === 'harvested' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
          }`}>
            {hive.status}
          </span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <HealthRing health={hive.health} size={60} />
          <div>
            <p className="text-2xl font-black text-slate-800">{hive.health}%</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colony Health</p>
          </div>
        </div>
        <KPICard label="Current Temp" value={`${hive.temp}°C`} icon={Thermometer} color="amber" />
        <KPICard label="Humidity" value={`${hive.humidity}%`} icon={Droplets} color="primary" />
        <KPICard label="Apiary" value={hive.apiary} icon={MapPin} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Ownership */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Ownership & Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-xs text-slate-500 font-medium">Beekeeper UID</span>
                <span className="text-xs font-mono text-slate-700">{hive.userId}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-xs text-slate-500 font-medium">Last Inspection</span>
                <span className="text-xs text-slate-700 font-semibold">
                  {inspections[0] ? format(new Date(inspections[0].timestamp), 'dd MMM yyyy') : 'No record'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-slate-500 font-medium">Last Harvest</span>
                <span className="text-xs text-slate-700 font-semibold">
                  {hive.lastHarvest ? format(new Date(hive.lastHarvest), 'dd MMM yyyy') : 'Never'}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Location
            </h2>
            <div className="h-40 bg-slate-50 rounded-xl relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '16px 16px' }}
              />
              <div className="relative z-10 flex flex-col items-center gap-1 group cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-white transition-transform group-hover:scale-110">
                  <Hexagon className="w-5 h-5 text-white fill-current" />
                </div>
                <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-lg">
                  {hive.locationLat?.toFixed(4)}, {hive.locationLng?.toFixed(4)}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Middle/Right Columns: History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inspection History */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Inspection History
              </h2>
            </div>
            {inspections.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No inspections yet" description="All logs from beekeepers will appear here." />
            ) : (
              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                {inspections.sort((a, b) => b.timestamp - a.timestamp).map((insp) => (
                  <div key={insp.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-12 pt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {format(new Date(insp.timestamp), 'MMM')}
                      </p>
                      <p className="text-lg font-black text-slate-800 leading-none">
                        {format(new Date(insp.timestamp), 'dd')}
                      </p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-slate-700">Inspection by BK</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                            {format(new Date(insp.timestamp), 'HH:mm')} · ID: {insp.id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="text-right">
                          <HealthBadge health={insp.queenSpotted ? 90 : 40} showLabel size="sm" />
                          <p className="text-[9px] text-slate-400 mt-0.5">Queen {insp.queenSpotted ? 'Spotted' : 'Missing'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-50">
                        <div className="text-center">
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Brood</p>
                          <p className="text-xs font-bold text-slate-700">{insp.broodFrames} Frames</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Mites</p>
                          <p className="text-xs font-bold text-slate-700">{insp.miteCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Temp</p>
                          <p className="text-xs font-bold text-slate-700">35.2°C</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 italic">{insp.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Harvest History */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" />
                Harvest History
              </h2>
            </div>
            {harvests.length === 0 ? (
              <EmptyState icon={FlaskConical} title="No harvests recorded" />
            ) : (
              <div className="divide-y divide-slate-50">
                {harvests.sort((a, b) => b.timestamp - a.timestamp).map((harvest) => (
                  <div key={harvest.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onNavigate('harvest-detail', harvest.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Batch {harvest.batchId}</p>
                        <p className="text-[10px] text-slate-500">{harvest.floraType} · {format(new Date(harvest.timestamp), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-lg font-black text-primary">{harvest.quantity}kg</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">{harvest.purity}% Purity</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
