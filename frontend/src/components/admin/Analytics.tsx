/**
 * Analytics — SVG/CSS based charts for trends and yield
 */
import React from 'react';
import { 
  BarChart2, TrendingUp, TrendingDown, Maximize2,
  Calendar, MapPin, FlaskConical, Activity
} from 'lucide-react';
import { KPICard } from '../shared';
import { useHives, useHarvests } from '../../hooks/useLocalData';

export function Analytics() {
  const hives    = useHives() ?? [];
  const harvests = useHarvests() ?? [];

  // Mock Trend Data (SVG based)
  const healthData = [65, 58, 62, 70, 75, 82, 80, 85, 88, 86, 90, 92];
  const yieldData = [20, 25, 45, 30, 55, 40, 60, 50, 70, 65, 80, 75];

  const maxHealth = Math.max(...healthData);
  const maxYield  = Math.max(...yieldData);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-500">Seasonal Performance & Health Trends</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Last 12 Months</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Trend Chart */}
        <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Apiary Health Index
            </h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Avg</span>
              </div>
            </div>
          </div>

          <div className="h-64 relative flex items-end justify-between gap-1 px-2">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-2 border-b border-slate-100 pointer-events-none">
              {[1, 2, 3, 4].map(i => <div key={i} className="w-full border-t border-slate-50" />)}
            </div>
            
            {/* Line Chart SVG */}
            <svg className="absolute inset-0 w-full h-full preserve-3d" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path 
                d={`M 0,${100 - healthData[0]} ${healthData.map((d, i) => `L ${(i / (healthData.length-1)) * 100},${100 - d}`).join(' ')}`}
                fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"
              />
              <path 
                d={`M 0,${100 - healthData[0]} ${healthData.map((d, i) => `L ${(i / (healthData.length-1)) * 100},${100 - d}`).join(' ')} V 100 H 0 Z`}
                className="text-primary/10" fill="currentColor"
              />
            </svg>

            {/* Interaction points */}
            {healthData.map((d, i) => (
              <div key={i} className="group relative z-10 w-1 flex flex-col items-center justify-end h-full">
                <div 
                  className="w-2.5 h-2.5 bg-white border-2 border-primary rounded-full mb-[-5px] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  style={{ marginBottom: `${d}%` }}
                />
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-slate-900 px-2 py-1 rounded text-[10px] font-bold text-white shadow-xl">
                    {d}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-2">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
              <span key={m} className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{m}</span>
            ))}
          </div>
        </section>

        {/* Quick Stats sidebar */}
        <div className="space-y-4">
          <KPICard label="Peak Health" value={`${maxHealth}%`} icon={TrendingUp} color="green" />
          <KPICard label="Max Monthly Yield" value={`${maxYield}kg`} icon={FlaskConical} color="primary" />
          <KPICard label="Alert Frequency" value="-12%" icon={Activity} color="amber" trend="down" trendValue="12%" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield Bar Chart */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            Monthly Yield Trend
          </h2>
          <div className="h-48 flex items-end justify-between gap-3 px-2">
            {yieldData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <div className="relative w-full">
                  <div 
                    className="w-full bg-primary/20 rounded-t-lg transition-all group-hover:bg-primary/40"
                    style={{ height: `${(d / maxYield) * 100}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg">{d}kg</span>
                  </div>
                </div>
                <span className="text-[8px] font-bold text-slate-400 uppercase rotate-45 mt-2 origin-left">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Apiary Comparison Heatmap (Simple CSS based) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Apiary Performance Matrix
          </h2>
          <div className="space-y-3">
            {[
              { name: 'Heritage West', yield: 840, health: 92, color: 'bg-green-500' },
              { name: 'Valley Apiary', yield: 620, health: 78, color: 'bg-amber-500' },
              { name: 'North Ridge', yield: 410, health: 85, color: 'bg-green-500' },
              { name: 'Swamp Edge', yield: 180, health: 42, color: 'bg-red-500' },
            ].map(apiary => (
              <div key={apiary.name} className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-bold text-slate-700">{apiary.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono font-bold">{apiary.yield}kg extracted</p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                  <div className={cn('h-full rounded-full transition-all duration-1000', apiary.color)} 
                    style={{ width: `${apiary.health}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Colony Health Index</span>
                  <span>{apiary.health}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
