import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MapView } from '../components/field/MapView';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const FieldPage = ({ user }: any) => {
  const [month, setMonth] = useState(new Date().getMonth()); // 0-indexed

  const prev = () => setMonth(m => (m + 11) % 12);
  const next = () => setMonth(m => (m + 1) % 12);

  return (
    <div className="page-enter bg-[#f8f9fa] flex flex-col h-[100dvh]">
      {/* Top bar */}
      <div className="flex flex-col min-[420px]:flex-row items-start min-[420px]:items-center justify-between gap-4 p-5 pt-4 bg-white border-b border-slate-100 z-10 relative">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Field Analysis</h1>
          <p className="text-xs font-medium text-slate-500 mt-1 max-w-[280px]">Analyze locations for estimated forage suitability and flowering trends</p>
        </div>

        <div className="flex items-center justify-between w-full min-[420px]:w-auto gap-3">
          {/* Month picker */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-xl p-1 shrink-0">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm active:scale-95 text-slate-500 transition-all" onClick={prev}><ChevronLeft size={16} strokeWidth={2.5} /></button>
            <span className="text-xs font-bold w-10 text-center text-slate-700">{MONTHS[month]}</span>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm active:scale-95 text-slate-500 transition-all" onClick={next}><ChevronRight size={16} strokeWidth={2.5} /></button>
          </div>

          {/* Live badge */}
          <div className="flex items-center gap-2 bg-rose-50/80 px-3 py-2 rounded-xl border border-rose-100/50 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span className="text-[10px] font-black text-rose-700 tracking-widest uppercase">LIVE</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <MapView selectedMonth={month + 1} user={user} />
      </div>
    </div>
  );
};
