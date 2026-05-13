import React from 'react';
import { Hexagon, Shield, Zap, Globe, Github } from 'lucide-react';

export const AboutHiveOps = () => {
  return (
    <div className="page-enter pb-12">
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">About HiveOps</h1>
        <p className="text-sm font-medium text-slate-400 mt-1">Precision Apiculture & Traceability</p>
      </div>

      <div className="bg-[#5D0623] rounded-3xl p-8 shadow-sm text-white mb-8 relative overflow-hidden">
        <div className="absolute right-[-10%] top-[-20%] opacity-10">
          <Hexagon size={200} fill="white" />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-4">Our Mission</h2>
          <p className="text-white/80 text-sm leading-relaxed mb-6 font-medium">
            HiveOps bridges the gap between traditional beekeeping and modern data science. 
            By leveraging machine learning and satellite intelligence, we empower apiarists 
            to maximize yield while ensuring the ethical health of their colonies.
          </p>
          <div className="flex gap-4">
             <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest">Version 1.0.4</div>
             <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest">Stable Build</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-4 px-2">Core Technology</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Globe size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-slate-800">Satellite Intelligence</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">NDVI-based flora density analysis and terrain evaluation for optimal placement.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-slate-800">ML Decision Support</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">Predictive yield modeling using historical climate data and regional bloom cycles.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Shield size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-slate-800">Provenance Ledger</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">Consumer-grade QR traceability linking every jar to its specific hive and harvest date.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Regional Focus</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium mb-4">
            Currently optimized for the specific floral biodiversity and climatic patterns of **Tamil Nadu, India**.
          </p>
          <div className="h-px bg-slate-50 mb-4" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github size={16} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Open Source Core</span>
            </div>
            <span className="text-[10px] font-bold text-slate-300">© 2026 HiveOps Team</span>
          </div>
        </div>
      </div>
    </div>
  );
};
