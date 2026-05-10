import React, { useState } from 'react';
import { BottomSheet } from '../../components/layout/BottomSheet';
import { 
  Target, Settings2, BarChart3, TrendingUp, ArrowRight, 
  MapPin, Calendar, Boxes, Zap, ShieldAlert, ChevronRight, 
  RefreshCw, Info, CheckCircle2 
} from 'lucide-react';
import { allocateHives, runSimulation, SimulationResult } from '../../api/optimizationApi';

import { SavedLocation } from '../../lib/db';

interface StrategicPlanningSheetProps {
  isOpen: boolean;
  onClose: () => void;
  locations: SavedLocation[];
}

interface PlanningRecommendation {
  plan: Array<{ month: number; lat: number; lng: number; score: number }>;
}

interface PlanningResult {
  recommendations: PlanningRecommendation[];
}

export const StrategicPlanningSheet: React.FC<StrategicPlanningSheetProps> = ({ isOpen, onClose, locations }) => {
  const [step, setStep] = useState<'config' | 'results'>('config');
  const [hiveCount, setHiveCount] = useState(10);
  const [months, setMonths] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanningResult | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const handleRunPlanning = async () => {
    setLoading(true);
    try {
      const [alloc, sim] = await Promise.all([
        allocateHives({
          locations,
          hiveCount,
          months,
          useTimeOptimization: true
        }),
        runSimulation({
          locations,
          hiveCount,
          iterations: 50
        })
      ]);
      setResult(alloc);
      setSimResult((sim as any).data || sim);
      setStep('results');
    } catch (e) {
      console.error('Planning failed', e);
      alert('Planning engine encountered an error. Please check parameters.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('config');
    setResult(null);
    setSimResult(null);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Migration Planner">
      <div className="p-1">
        {step === 'config' ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <Target size={20} className="text-[#5D0623]" />
                <h4 className="font-bold text-slate-800">Planning Settings</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Configure your apiary expansion. The engine will analyze {locations.length} candidate zones 
                to determine the optimal multi-month migration path.
              </p>
            </div>

            {/* Config Inputs */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  <Boxes size={12} /> Target Hive Capacity
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="1" max="100" step="1"
                    value={hiveCount} onChange={e => setHiveCount(parseInt(e.target.value))}
                    className="flex-1 accent-[#5D0623]"
                  />
                  <span className="text-lg font-black text-slate-800 w-12 text-right">{hiveCount}</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  <Calendar size={12} /> Planning Horizon
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map(m => (
                    <button
                      key={m}
                      onClick={() => setMonths(m)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        months === m ? 'bg-[#5D0623] text-white border-[#5D0623]' : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {m} Mo
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Zone Summary */}
            <div className="border-t border-slate-100 pt-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Candidate Zones</label>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {locations.map((loc, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">{loc.name || `Zone ${i+1}`}</span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      SCORE: {loc.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleRunPlanning}
              disabled={loading || locations.length === 0}
              className="w-full btn-primary py-4 rounded-2xl flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <><RefreshCw size={18} className="animate-spin" /> RUNNING OPTIMIZATION...</>
              ) : (
                <><Zap size={18} /> GENERATE STRATEGIC PLAN</>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-green-600" />
                <h4 className="font-bold text-slate-800">Yield Projection</h4>
              </div>
              <button onClick={reset} className="text-[10px] font-black text-[#5D0623] uppercase hover:underline">Reconfigure</button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-green-600" />
                  <span className="text-[10px] font-black text-green-700 uppercase">Projected Increase</span>
                </div>
                <div className="text-2xl font-black text-green-800">
                  +{simResult?.improvement_percent || 0}%
                </div>
                <p className="text-[10px] text-green-600 font-bold mt-1 uppercase">Compared to fixed location</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Boxes size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase">Mean Score</span>
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {simResult?.optimized_avg.toFixed(1) || 0}
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Over {months} Months</p>
              </div>
            </div>

            {/* Movement Timeline */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Relocation Schedule</label>
              <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {result?.recommendations?.[0]?.plan.map((step: any, i: number) => (
                  <div key={i} className="flex gap-4 relative z-10">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${
                      i === 0 ? 'bg-[#5D0623] text-white' : 'bg-white text-slate-400 border border-slate-200'
                    }`}>
                      {step.month}
                    </div>
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-700 uppercase">Month {step.month}</span>
                        <div className="flex items-center gap-1">
                          <Zap size={10} className="text-yellow-500" />
                          <span className="text-[10px] font-bold text-slate-500">{step.score}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-1">
                        Coordinate: {step.lat.toFixed(4)}, {step.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Disclaimer */}
            <div className="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                Projections are based on Monte Carlo simulations ({simResult?.iterations_run} iterations). 
                Environmental variance in rural Tamil Nadu may affect actual yields. 
                Maintain local inspections to validate strategic advice.
              </p>
            </div>

            <button onClick={onClose} className="w-full btn-secondary py-3.5 rounded-xl text-sm font-bold">
              DONE
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
