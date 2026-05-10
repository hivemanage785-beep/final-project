import React from 'react';
import { Bell, Info, Zap } from 'lucide-react';

export const Notifications = () => {
  // Persistence is not yet implemented in the backend. 
  // Toggles are currently locked to system defaults.
  const alertsEnabled = true;
  const recommendationsEnabled = true;

  return (
    <div className="page-enter bg-[#f8f9fa] min-h-[100dvh] pb-24 px-4 pt-4">
      <div className="mb-6 pt-2 px-1">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Intelligence</h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">Manage system alerts and insights</p>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 mb-6">
        {/* Alerts Toggle */}
        <div className="flex items-center justify-between mb-8 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
              <Bell size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Critical Alerts</p>
              <p className="text-[11px] font-medium text-slate-400">Hive health and weather risks</p>
            </div>
          </div>
          <div 
            className="w-12 h-6 rounded-full relative cursor-not-allowed transition-colors"
            style={{ background: alertsEnabled ? '#9b0a00' : '#E2E8F0' }}
          >
            <div 
              className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm"
              style={{ left: alertsEnabled ? '26px' : '2px' }}
            />
          </div>
        </div>

        {/* Recommendations Toggle */}
        <div className="flex items-center justify-between opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              <Zap size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">ML Recommendations</p>
              <p className="text-[11px] font-medium text-slate-400">Placement and forage insights</p>
            </div>
          </div>
          <div 
            className="w-12 h-6 rounded-full relative cursor-not-allowed transition-colors"
            style={{ background: recommendationsEnabled ? '#9b0a00' : '#E2E8F0' }}
          >
            <div 
              className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm"
              style={{ left: recommendationsEnabled ? '26px' : '2px' }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 px-3 py-4 bg-slate-50 rounded-2xl border border-slate-100">
        <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
          System notification preferences are currently locked to active defaults. Notification preference syncing coming soon.
        </p>
      </div>
    </div>
  );
};
