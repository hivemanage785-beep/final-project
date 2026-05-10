import React, { useMemo, memo } from 'react';
import { Hexagon, MapPin, ClipboardList, Move, Info, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { Hive, db } from '../../lib/db';
import { OperationalSkeleton } from '../states/OperationalUI';
import { useLiveQuery } from 'dexie-react-hooks';

interface HiveCardProps {
  hive: Hive;
  onLog: (hive: Hive) => void;
  onMove: (hive: Hive) => void;
  onDetails: (hive: Hive) => void;
  onTrace: (hiveId: string) => void;
}

const isOverdue = (date?: string) => {
  if (!date) return true;
  const diff = (new Date().getTime() - new Date(date).getTime()) / (1000 * 3600 * 24);
  return diff > 14;
};

export const HiveCard = memo<HiveCardProps>(({ hive, onLog, onMove, onDetails, onTrace }) => {
  // Check for pending sync operations for this specific hive
  const pendingSync = useLiveQuery(
    () => db.outbox.where('entity').equals('hives').and(op => op.data?.id === hive.id).count(),
    [hive.id]
  ) || 0;

  // Check for environmental context if available in saved locations
  const envContext = useLiveQuery(
    () => db.savedLocations
      .where('uid').equals(hive.uid || '')
      .and(l => Math.abs(l.lat - hive.lat) < 0.0001 && Math.abs(l.lng - hive.lng) < 0.0001)
      .first(),
    [hive.uid, hive.lat, hive.lng]
  );

  const overdue = isOverdue(hive.last_inspection_date);
  const healthStatus = hive.health_status || 'fair';
  
  const statusColors = useMemo(() => {
    const colors = {
      good: { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' },
      fair: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
      poor: { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' }
    }[healthStatus as 'good' | 'fair' | 'poor'] || { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };
    return colors;
  }, [healthStatus]);

  const borderStyle = useMemo(() => {
    if (pendingSync > 0) return '1px solid #FEF3C7';
    if (overdue) return '1px solid #FEE2E2';
    return '1px solid var(--c-border)';
  }, [pendingSync, overdue]);

  return (
    <div className="card" style={{ marginBottom: 12, border: borderStyle, background: overdue ? '#FFFDFD' : 'white' }}>
      {/* A. Identity & Sync State */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--c-border2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ 
              width: 44, height: 44, borderRadius: 16, 
              background: statusColors.bg, display: 'flex', 
              alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${statusColors.border}`
            }}>
              <Hexagon size={20} color={statusColors.text} fill={statusColors.text} opacity={0.8} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--c-text1)' }}>{hive.hive_id}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MapPin size={11} color="#94A3B8" />
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                  {hive.placement_location_name || `${hive.lat.toFixed(4)}, ${hive.lng.toFixed(4)}`}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ 
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase', 
              padding: '4px 8px', borderRadius: 6, 
              background: statusColors.bg, color: statusColors.text,
              letterSpacing: '0.04em'
            }}>
              {healthStatus}
            </span>
            {pendingSync > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <RefreshCw size={10} color="#B45309" className="animate-spin" />
                <span style={{ fontSize: 9, fontWeight: 800, color: '#B45309' }}>SYNC PENDING</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* B. Operational Metrics & Urgency */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {/* Core Stats */}
        <div style={{ flex: 1, minWidth: '100px', display: 'flex', gap: 16 }}>
           <div>
             <p style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Boxes</p>
             <p style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{hive.box_count || 1}</p>
           </div>
           <div>
             <p style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Queen</p>
             <p style={{ fontSize: 13, fontWeight: 800, color: hive.queen_status === 'missing' ? '#B91C1C' : '#1E293B' }}>
               {hive.queen_status === 'healthy' ? 'Present' : hive.queen_status === 'missing' ? 'MISSING' : 'Unknown'}
             </p>
           </div>
        </div>

        {/* Inspection Status */}
        <div style={{ flex: 1, minWidth: '110px' }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Last Check</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: overdue ? '#B91C1C' : 'var(--c-text1)' }}>
              {overdue ? 'OVERDUE' : `${Math.floor((new Date().getTime() - new Date(hive.last_inspection_date).getTime()) / (1000 * 3600 * 24))}d ago`}
            </span>
            {overdue && <AlertCircle size={12} color="#B91C1C" />}
          </div>
        </div>
      </div>

      {/* C. Environmental Intelligence (REAL data only) */}
      {envContext && (
        <div style={{ margin: '0 12px 12px', background: 'rgba(29, 78, 216, 0.03)', padding: '12px', borderRadius: 16, border: '1px solid rgba(29, 78, 216, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={12} className="text-blue-600" fill="currentColor" />
              <p style={{ fontSize: 10, fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase' }}>Zone Intelligence</p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#1D4ED8' }}>GRADE {envContext.grade || 'A'}</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginTop: 6, lineHeight: 1.4 }}>
            {envContext.suitability_label} conditions. Zone suitability analysis available for these coordinates.
          </p>
        </div>
      )}

      {/* D. Operational Quick Actions */}
      <div style={{ padding: '8px 12px 12px', display: 'flex', gap: 8 }}>
        <button 
          className="active:scale-95 transition-transform"
          onClick={() => onLog(hive)}
          style={{ 
            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#5D0623', color: 'white', border: 'none',
            padding: '14px', borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(93, 6, 35, 0.15)'
          }}
        >
          <ClipboardList size={16} strokeWidth={2.5} /> Log Inspection
        </button>
        <button 
          className="active:scale-95 transition-transform"
          onClick={() => onMove(hive)}
          style={{ 
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: '#fff', color: '#64748B', border: '1px solid #E2E8F0',
            padding: '10px', borderRadius: 14, fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}
        >
          <Move size={14} /> Move
        </button>
        <button 
          className="active:scale-95 transition-transform"
          onClick={() => onDetails(hive)}
          style={{ 
            width: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#F8FAFC', color: '#94A3B8', border: '1px solid #E2E8F0',
            borderRadius: 14, cursor: 'pointer'
          }}
        >
          <Info size={18} />
        </button>
      </div>
    </div>
  );
});
