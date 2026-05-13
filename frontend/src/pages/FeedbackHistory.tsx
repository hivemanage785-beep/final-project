import React, { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import { MapPin, Thermometer, Droplets, CloudRain, CheckCircle2, AlertTriangle, AlertCircle, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FeedbackHistory = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiGet('/api/feedback-history')
      .then((d: any) => {
        if (d.success) setData(d.entries || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-enter bg-[#f8f9fa] min-h-[100dvh] pb-24 px-5 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 pt-2">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Feedback History</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">Your submitted model refinement records</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#5D0623] mb-4" size={32} />
          <p className="text-sm font-semibold text-slate-500">Loading records...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm mt-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
            <MessageSquare size={28} className="text-slate-400" strokeWidth={2} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">No Records Found</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-[240px] mx-auto">
            You haven't submitted any performance feedback for your apiary locations yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {data.map((e, i) => {
            const isGood = e.actual_outcome === 'Good';
            const isFair = e.actual_outcome === 'Fair';
            const statusColor = isGood ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : isFair ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-rose-600 bg-rose-50 border-rose-100';
            const StatusIcon = isGood ? CheckCircle2 : isFair ? AlertTriangle : AlertCircle;

            return (
              <div key={e._id || i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      <MapPin size={16} className="text-[#5D0623]" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 tracking-tight">
                        {e.lat?.toFixed(4)}°N, {e.lng?.toFixed(4)}°E
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                        Predicted Score: <span className="text-slate-600">{e.predicted_score}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${statusColor}`}>
                    <StatusIcon size={12} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{e.actual_outcome}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-slate-50/50 rounded-xl p-3 border border-slate-50">
                  <div className="flex items-center gap-2">
                    <Thermometer size={14} className="text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Temp</p>
                      <p className="text-xs font-semibold text-slate-700">{e.temperature?.toFixed(1)}°C</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                    <Droplets size={14} className="text-blue-400 shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hum</p>
                      <p className="text-xs font-semibold text-slate-700">{e.humidity?.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                    <CloudRain size={14} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rain</p>
                      <p className="text-xs font-semibold text-slate-700">{e.rainfall?.toFixed(1)}mm</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
