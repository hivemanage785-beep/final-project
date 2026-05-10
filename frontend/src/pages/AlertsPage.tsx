import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Bell, AlertCircle, AlertTriangle, CheckCircle2, Info, 
  Wifi, WifiOff, RefreshCw, Hexagon, CloudRain, MapPin, 
  ChevronRight, ClipboardList, Database, Zap
} from 'lucide-react';
import { db } from '../lib/db';
import { useSync } from '../hooks/useSync';
import { useAuth } from '../hooks/useAuth';
import { fetchAlerts, Alert as BackendAlert } from '../api/alertApi';
import { Link } from 'react-router-dom';

/* ── Types & Config ── */
interface CombinedAlert extends BackendAlert {
  category: 'Hive Health & Inspections' | 'Environmental Conditions' | 'Movement & Placement Guidance' | 'Sync & Connectivity' | 'System/Administrative Notices';
  actionLabel?: string;
  actionLink?: string;
  isLocal?: boolean;
}

const CATEGORIES = [
  'Hive Health & Inspections',
  'Environmental Conditions',
  'Movement & Placement Guidance',
  'Sync & Connectivity',
  'System/Administrative Notices'
] as const;

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2, success: 3 };

/* ── Helpers ── */
const isOverdue = (date?: string) => {
  if (!date) return true;
  const diff = (new Date().getTime() - new Date(date).getTime()) / (1000 * 3600 * 24);
  return diff > 14;
};

/* ── Sub-components ── */
const AlertCard: React.FC<{ alert: CombinedAlert }> = ({ alert }) => {
  const Icon = {
    critical: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info
  }[alert.type] || Info;

  const severityStyles = {
    critical: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', accent: 'bg-rose-600' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', accent: 'bg-amber-600' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-600' },
    info: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', accent: 'bg-blue-600' }
  }[alert.type] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', accent: 'bg-slate-600' };

  return (
    <div className={`relative p-4 mb-3 rounded-3xl border transition-all ${severityStyles.bg} ${severityStyles.border} ${alert.unread ? 'shadow-sm' : 'opacity-75'}`}>
      <div className="flex gap-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-white shadow-sm`}>
          <Icon size={18} className={severityStyles.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[13px] font-black text-slate-900 leading-tight pr-4">{alert.title}</p>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">{alert.source}</span>
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed font-medium">{alert.desc}</p>
          
          {alert.actionLabel && (
            <Link 
              to={alert.actionLink || '#'} 
              className={`inline-flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-widest active:opacity-75 transition-opacity ${severityStyles.text}`}
            >
              {alert.actionLabel} <ChevronRight size={12} strokeWidth={3} />
            </Link>
          )}
        </div>
      </div>
      {alert.unread && (
        <div className={`absolute top-4 right-4 w-1.5 h-1.5 rounded-full ${severityStyles.accent}`} />
      )}
    </div>
  );
};

/* ── Page ── */
export const AlertsPage = () => {
  const { user } = useAuth();
  const { isOnline, isSyncing } = useSync();
  const pendingCount = useLiveQuery(() => db.outbox.count()) || 0;

  // Local operational signals
  const hives = useLiveQuery(() => db.hives.where('uid').equals(user?.uid || '').toArray(), [user]) || [];
  const dbAlerts = useLiveQuery(() => db.alerts.reverse().sortBy('timestamp')) || [];

  const [loading, setLoading] = useState(true);

  // Sync backend alerts to local cache
  useEffect(() => {
    if (!isOnline) {
      setLoading(false);
      return;
    }
    const syncAlerts = async () => {
      try {
        const backendAlerts = await fetchAlerts();
        // Map backend sources to categories
        const mapped = backendAlerts.map(a => ({
          ...a,
          category: (a as any).category || (a.source.includes('Environment') ? 'Environmental Conditions' : 'System/Administrative Notices'),
          timestamp: (a as any).timestamp || new Date().toISOString()
        }));
        await db.alerts.clear();
        await db.alerts.bulkPut(mapped as any);
      } catch (e) {
        console.error('[ALERTS] Sync failed', e);
      } finally {
        setLoading(false);
      }
    };
    syncAlerts();
  }, [isOnline]);

  // Synthesize operational alerts from local state
  const combinedAlerts = useMemo(() => {
    const localSignals: CombinedAlert[] = [];

    // 1. Overdue Inspections
    hives.forEach(h => {
      if (isOverdue(h.last_inspection_date)) {
        localSignals.push({
          id: `overdue-${h.id}`,
          type: 'critical',
          category: 'Hive Health & Inspections',
          title: 'Inspection Overdue',
          desc: `Hive ${h.hive_id} has not been inspected for over 14 days. This reduces health visibility.`,
          source: 'Operational Monitor',
          unread: true,
          isLocal: true,
          actionLabel: 'Log Inspection',
          actionLink: '/hives'
        });
      }
    });

    // 2. Poor Health Signals
    hives.forEach(h => {
      if (h.health_status === 'poor') {
        localSignals.push({
          id: `health-${h.id}`,
          type: 'critical',
          category: 'Hive Health & Inspections',
          title: 'Critical Health Warning',
          desc: `Immediate attention required for ${h.hive_id}. Health state reported as poor.`,
          source: 'Field Intelligence',
          unread: true,
          isLocal: true,
          actionLabel: 'View Details',
          actionLink: '/hives'
        });
      }
    });

    // 3. Sync Accumulation
    if (pendingCount > 3) {
      localSignals.push({
        id: 'sync-lag',
        type: 'warning',
        category: 'Sync & Connectivity',
        title: 'Pending Data Sync',
        desc: `You have ${pendingCount} operational logs waiting for cloud synchronization.`,
        source: 'Sync Engine',
        unread: true,
        isLocal: true,
        actionLabel: 'Check Connectivity',
        actionLink: '/today'
      });
    }

    // Merge with cached backend alerts
    const all = [...localSignals, ...(dbAlerts as unknown as CombinedAlert[])];
    
    // De-duplicate (e.g. if backend and frontend both report overdue)
    const seen = new Set();
    const unique = all.filter(a => {
      const key = `${a.category}-${a.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort((a, b) => SEVERITY_ORDER[a.type] - SEVERITY_ORDER[b.type]);
  }, [hives, dbAlerts, pendingCount]);

  return (
    <div className="page-enter">
      {/* Operational Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="flex items-center gap-1">
              {isOnline ? <Wifi size={10} color="#15803D" /> : <WifiOff size={10} color="#B91C1C" />}
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isOnline ? '#15803D' : '#B91C1C' }}>
                {isOnline ? 'Live Feed' : 'Offline Cache'}
              </span>
            </div>
            {(isSyncing || pendingCount > 0) && (
              <div className="flex items-center gap-1">
                <RefreshCw size={10} color="#B45309" className={isSyncing ? 'animate-spin' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#B45309' }}>
                  {isSyncing ? 'Syncing...' : `${pendingCount} Local Updates`}
                </span>
              </div>
            )}
          </div>
        </div>
        <Bell size={24} color="var(--c-primary)" fill="var(--c-primary)" opacity={0.15} />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)}
        </div>
      ) : combinedAlerts.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={32} color="#15803D" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>Operations Stable</h3>
          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
            No critical health issues, environmental risks, or sync delays detected in your apiaries.
          </p>
        </div>
      ) : (
        CATEGORIES.map(category => {
          const group = combinedAlerts.filter(a => a.category === category);
          if (group.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: 24 }}>
              <h3 className="section-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                {category === 'Hive Health & Inspections' && <Hexagon size={12} />}
                {category === 'Environmental Conditions' && <CloudRain size={12} />}
                {category === 'Movement & Placement Guidance' && <MapPin size={12} />}
                {category === 'Sync & Connectivity' && <RefreshCw size={12} />}
                {category === 'System/Administrative Notices' && <Database size={12} />}
                {category}
              </h3>
              {group.map(alert => <AlertCard key={alert.id} alert={alert} />)}
            </div>
          );
        })
      )}
    </div>
  );
};

