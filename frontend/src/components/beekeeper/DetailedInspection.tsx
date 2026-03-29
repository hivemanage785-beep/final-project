/**
 * Detailed Inspection — Full form for comprehensive colony audits
 */
import React, { useState } from 'react';
import { 
  ArrowLeft, Check, ClipboardList, Mic, 
  Camera, Image as ImageIcon, Ruler, Thermometer,
  ShieldCheck, Save, Music
} from 'lucide-react';
import { inspectionRepository } from '../../repositories/inspectionRepository';
import { cn } from '../../lib/utils';
import { useHives } from '../../hooks/useLocalData';

interface DetailedInspectionProps {
  hiveId: string;
  onClose: () => void;
  userId: string;
}

export function DetailedInspection({ hiveId, onClose, userId }: DetailedInspectionProps) {
  const hives = useHives() ?? [];
  const hive  = hives.find(h => h.id === hiveId);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    queenSpotted: false,
    broodFrames: 5,
    miteCount: 0,
    nectarFrames: 2,
    pollenFrames: 1,
    varroaTreatment: false,
    notes: '',
    imageUri: ''
  });

  const handleSubmit = async () => {
    setLoading(true);
    await inspectionRepository.create({
      hiveId,
      userId,
      inspectorUid: userId,
      queenSpotted: form.queenSpotted,
      broodFrames: form.broodFrames,
      miteCount: form.miteCount,
      aggression: 'medium',
      notes: form.notes || 'Comprehensive inspection completed.',
      timestamp: Date.now()
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Audit</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{hive?.name ?? 'Detail'}</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="text-primary font-black text-xs uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? '...' : 'Save'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Banner */}
        <div className="bg-primary/5 px-6 py-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Heritage Grade Full Audit</p>
        </div>

        <div className="p-6 space-y-8 pb-32">
          {/* Main Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setForm(f => ({ ...f, queenSpotted: !f.queenSpotted }))}
              className={cn(
                "p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                form.queenSpotted ? "bg-amber-50 border-amber-500 shadow-md shadow-amber-500/10" : "bg-white border-slate-100"
              )}
            >
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", form.queenSpotted ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-400")}>
                <Check className="w-5 h-5" />
              </div>
              <span className={cn("text-[10px] font-black uppercase tracking-widest", form.queenSpotted ? "text-amber-700" : "text-slate-500")}>Queen Spotted</span>
            </button>

            <button 
              onClick={() => setForm(f => ({ ...f, varroaTreatment: !f.varroaTreatment }))}
              className={cn(
                "p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                form.varroaTreatment ? "bg-blue-50 border-blue-500 shadow-md shadow-blue-500/10" : "bg-white border-slate-100"
              )}
            >
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", form.varroaTreatment ? "bg-blue-500 text-white" : "bg-slate-50 text-slate-400")}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className={cn("text-[10px] font-black uppercase tracking-widest", form.varroaTreatment ? "text-blue-700" : "text-slate-500")}>Treatment Applied</span>
            </button>
          </div>

          {/* Steppers */}
          <div className="space-y-6">
            <section className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Frame Counts
              </label>
              <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">Brood Frames</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setForm(f => ({ ...f, broodFrames: Math.max(0, f.broodFrames - 1) }))} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">-</button>
                    <span className="text-base font-black text-slate-800 w-4 text-center">{form.broodFrames}</span>
                    <button onClick={() => setForm(f => ({ ...f, broodFrames: f.broodFrames + 1 }))} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">+</button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">Nectar/Honey</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setForm(f => ({ ...f, nectarFrames: Math.max(0, f.nectarFrames - 1) }))} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">-</button>
                    <span className="text-base font-black text-slate-800 w-4 text-center">{form.nectarFrames}</span>
                    <button onClick={() => setForm(f => ({ ...f, nectarFrames: f.nectarFrames + 1 }))} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">+</button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">Pollen Storage</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setForm(f => ({ ...f, pollenFrames: Math.max(0, f.pollenFrames - 1) }))} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">-</button>
                    <span className="text-base font-black text-slate-800 w-4 text-center">{form.pollenFrames}</span>
                    <button onClick={() => setForm(f => ({ ...f, pollenFrames: f.pollenFrames + 1 }))} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
            </section>

            {/* Mite count */}
            <section className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Ruler className="w-4 h-4" /> Varroa Mite Count (per 100 bees)
              </label>
              <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center gap-6">
                <input 
                  type="range" min="0" max="20" step="1"
                  value={form.miteCount}
                  onChange={(e) => setForm({ ...form, miteCount: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-slate-100 rounded-full accent-primary appearance-none cursor-pointer"
                />
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black",
                  form.miteCount > 5 ? "bg-red-50 text-red-500" : "bg-primary/10 text-primary"
                )}>
                  <span className="text-lg leading-none">{form.miteCount}</span>
                  <span className="text-[8px] uppercase">Mites</span>
                </div>
              </div>
            </section>

            {/* Media uploads */}
            <section className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Media Verification</label>
              <div className="grid grid-cols-2 gap-4">
                <button className="h-32 bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 active:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center"><Camera className="w-5 h-5" /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Photo</span>
                </button>
                <button className="h-32 bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 active:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center"><Mic className="w-5 h-5" /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Audio Log</span>
                </button>
              </div>
            </section>

            {/* Observations */}
            <section className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Field Observations</label>
              <textarea 
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Describe colony temperament, floral availability, and queen patterns..."
                className="w-full h-32 p-5 bg-white rounded-3xl border border-slate-100 outline-none text-slate-700 text-sm font-medium"
              />
            </section>
          </div>
        </div>
      </main>

      {/* Sticky Save Footer */}
      <footer className="p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 absolute bottom-0 left-0 w-full">
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
        >
          {loading ? (
            <RotateCw className="w-5 h-5 animate-spin" />
          ) : (
            <>Finalize Audit <Save className="w-5 h-5 text-primary" /></>
          )}
        </button>
      </footer>
    </div>
  );
}

const RotateCw = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
  </svg>
);
