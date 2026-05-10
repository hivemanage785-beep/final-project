import React from 'react';
import { RefreshCw, AlertCircle, ShieldAlert, CheckCircle2, Search, ArrowRight, Loader2, WifiOff } from 'lucide-react';

/* ── Standardized Skeletons ── */
export const OperationalSkeleton = ({ rows = 3, type = 'card' }: { rows?: number, type?: 'card' | 'list' | 'text' }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`skeleton rounded-2xl ${
          type === 'card' ? 'h-32' : type === 'list' ? 'h-16' : 'h-4'
        }`} />
      ))}
    </div>
  );
};

/* ── Standardized Loading State ── */
export const OperationalLoading = ({ message = "Loading operational intelligence..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <Loader2 className="animate-spin text-[#5D0623]/20 mb-4" size={40} />
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{message}</p>
  </div>
);

/* ── Standardized Empty State ── */
interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const OperationalEmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, title, description, actionLabel, onAction 
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-white rounded-[32px] border border-slate-100 shadow-sm">
    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 border border-slate-50">
      <Icon size={32} />
    </div>
    <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2">{title}</h3>
    <p className="text-sm text-slate-500 leading-relaxed max-w-[240px] mb-8">{description}</p>
    {actionLabel && (
      <button 
        onClick={onAction}
        className="flex items-center gap-2 text-xs font-black text-[#5D0623] uppercase tracking-widest hover:underline"
      >
        {actionLabel} <ArrowRight size={14} />
      </button>
    )}
  </div>
);

/* ── Standardized Failure State ── */
export const OperationalError = ({ 
  message = "System cluster communication failure", 
  onRetry 
}: { message?: string, onRetry?: () => void }) => (
  <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex flex-col items-center text-center">
    <ShieldAlert size={32} className="text-rose-500 mb-3" />
    <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Service Interruption</h4>
    <p className="text-xs text-rose-700 mt-1 mb-4 leading-relaxed font-medium">{message}</p>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="px-6 py-2 bg-white text-rose-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-200 shadow-sm active:scale-95 transition-all"
      >
        Retry Service Connection
      </button>
    )}
  </div>
);

/* ── Operational Status Banner (Global) ── */
export const GlobalOperationalStatus = ({ 
  isOnline, isSyncing, pendingCount 
}: { isOnline: boolean, isSyncing: boolean, pendingCount: number }) => {
  if (!isOnline) {
    return (
      <div className="bg-rose-600 text-white px-4 py-2 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest z-[3000] shadow-xl">
        <WifiOff size={14} />
        Offline: Field Records Queued Locally ({pendingCount})
      </div>
    );
  }

  if (isSyncing || pendingCount > 0) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest z-[3000] shadow-xl">
        <RefreshCw size={14} className="animate-spin" />
        Synchronizing Field Records... ({pendingCount} Remaining)
      </div>
    );
  }

  return null;
};
