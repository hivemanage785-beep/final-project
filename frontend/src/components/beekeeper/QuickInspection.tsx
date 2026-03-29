/**
 * Quick Inspection System — Fast data entry form
 */
import React, { useState, useEffect } from 'react';
import { 
  X, Check, ClipboardList, Mic, 
  Activity, ShieldCheck, Save, Trash2,
  ChevronLeft, ChevronRight, Crown
} from 'lucide-react';
import { useHives } from '../../hooks/useLocalData';
import { inspectionRepository } from '../../repositories/inspectionRepository';
import { cn } from '../../lib/utils';
import { SyncStatusBadge } from '../SyncStatusBadge';

interface QuickInspectionProps {
  onClose: () => void;
  userId: string;
}

export function QuickInspection({ onClose, userId }: QuickInspectionProps) {
  const hives = useHives() ?? [];
  const [step, setStep] = useState(0); // 0: select hive, 1: quick stats, 2: notes
  const [form, setForm] = useState({
    hiveId: '',
    queenSpotted: false,
    aggressionLevel: 2, // 1-5
    broodFrames: 3,
    miteCount: 0,
    notes: ''
  });

  const selectedHive = hives.find(h => h.id === form.hiveId);

  // Auto-save logic (local repository)
  const handleSubmit = async () => {
    if (!form.hiveId) return;
    
    await inspectionRepository.create({
      hiveId: form.hiveId,
      userId: userId,
      inspectorUid: userId,
      queenSpotted: form.queenSpotted,
      broodFrames: form.broodFrames,
      miteCount: form.miteCount,
      aggression: form.aggressionLevel > 3 ? 'high' : form.aggressionLevel > 1 ? 'medium' : 'low',
      notes: form.notes || 'Routine check. Colony stable.',
      timestamp: Date.now()
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Inspection</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            {step === 0 ? 'Select Colony' : step === 1 ? 'Quick Metrics' : 'Notes & Audio'}
          </p>
        </div>
        <div className="w-9 h-9 flex items-center justify-center">
          {form.hiveId && <SyncStatusBadge entityId={form.hiveId} showLabel={false} />}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1.5 bg-slate-100 flex">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn(
            "flex-1 transition-all duration-500",
            step >= i ? "bg-primary" : "bg-transparent"
          )} />
        ))}
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        {/* Step 0: Select Hive */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-800 leading-tight">Which hive are you<br />inspecting?</h3>
            <div className="grid grid-cols-1 gap-3">
              {hives.map(hive => (
                <button
                  key={hive.id}
                  onClick={() => { setForm({ ...form, hiveId: hive.id }); setStep(1); }}
                  className={cn(
                    "p-5 rounded-3xl border-2 text-left transition-all active:scale-[0.98]",
                    form.hiveId === hive.id 
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10" 
                      : "border-slate-100 bg-white"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-slate-800">{hive.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{hive.apiary}</p>
                    </div>
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      hive.health >= 80 ? "bg-green-500" : hive.health >= 50 ? "bg-amber-500" : "bg-red-500"
                    )} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Quick Metrics */}
        {step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            {/* Queen Spotted Toggle */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Crown className="w-3 h-3 text-amber-500" /> Queen Spotted?
              </label>
              <div className="flex gap-3">
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    onClick={() => setForm({ ...form, queenSpotted: val })}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest border-2 transition-all",
                      form.queenSpotted === val 
                        ? "bg-slate-900 text-white border-slate-900" 
                        : "bg-white text-slate-400 border-slate-100"
                    )}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            {/* Brood Frames Stepper */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Brood Frames Count</label>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <button 
                  onClick={() => setForm(f => ({ ...f, broodFrames: Math.max(0, f.broodFrames - 1) }))}
                  className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-600 active:bg-slate-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <span className="text-4xl font-black text-slate-800">{form.broodFrames}</span>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Frames</p>
                </div>
                <button 
                  onClick={() => setForm(f => ({ ...f, broodFrames: Math.min(20, f.broodFrames + 1) }))}
                  className="w-12 h-12 rounded-2xl bg-primary shadow-sm flex items-center justify-center text-white active:opacity-90"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Aggression Slider */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Aggression Level</label>
                <span className="text-xs font-black text-primary">
                  {['Calm', 'Gentle', 'Active', 'Defensive', 'Aggressive'][form.aggressionLevel - 1]}
                </span>
              </div>
              <input 
                type="range" min="1" max="5" step="1"
                value={form.aggressionLevel}
                onChange={(e) => setForm({ ...form, aggressionLevel: parseInt(e.target.value) })}
                className="w-full h-8 accent-primary cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Step 2: Notes & Voice */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <h3 className="text-xl font-black text-slate-800 leading-tight">Any additional<br />observations?</h3>
            
            <textarea 
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Preparing to swarm, added honey super..."
              className="w-full h-40 p-5 bg-slate-50 rounded-3xl border border-slate-100 outline-none text-slate-700 text-sm font-medium placeholder:text-slate-300"
            />

            <button className="w-full py-5 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-2 group active:bg-primary/20 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg group-active:scale-90 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Record Voice Note</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer Nav */}
      <footer className="p-6 border-t border-slate-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {step === 0 ? (
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select a hive to proceed</p>
        ) : (
          <div className="flex gap-4">
            <button 
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button 
              onClick={() => step < 2 ? setStep(s => s + 1) : handleSubmit()}
              className="flex-[2] py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {step === 2 ? (
                <>Complete <Check className="w-4 h-4" /></>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
