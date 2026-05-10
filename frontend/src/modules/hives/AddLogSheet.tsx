import React, { useState } from 'react';
import { db, Inspection } from '../../lib/db';
import { useSync } from '../../hooks/useSync';
import { useAuth } from '../../hooks/useAuth';
import { CheckCircle2, X, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  hiveId: string;
  hiveName: string;
  onClose: () => void;
  onAdded: () => void;
}

export const AddLogSheet: React.FC<Props> = ({ isOpen, hiveId, hiveName, onClose, onAdded }) => {
  const { user } = useAuth();
  const { queueOperation, isOnline } = useSync();

  const [notes, setNotes] = useState('');
  const [health, setHealth] = useState<'good' | 'fair' | 'poor'>('good');
  const [queen, setQueen] = useState<'healthy' | 'missing' | 'replaced'>('healthy');
  const [boxes, setBoxes] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!user || !hiveId) return;
    setSubmitting(true);
    
    const date = new Date().toISOString();
    const doc: Inspection = {
      id: crypto.randomUUID(),
      uid: user.uid,
      hive_id: hiveId,
      date,
      notes: notes.trim(),
      box_count: boxes,
      queen_status: queen,
      health_status: health
    };

    try {
      // 1. Save to local IndexedDB for immediate consistency
      await db.inspections.add(doc);
      
      // 2. Update parent hive record locally
      await db.hives.update(hiveId, {
        last_inspection_date: date,
        health_status: health,
        queen_status: queen,
        box_count: boxes
      });

      // 3. Queue for backend synchronization
      await queueOperation('inspections', 'create', doc);
      await queueOperation('hives', 'update', { 
        id: hiveId, 
        last_inspection_date: date, 
        health_status: health, 
        queen_status: queen, 
        box_count: boxes 
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onAdded();
        onClose();
        setNotes('');
      }, 800);
    } catch (e) {
      console.error('Failed to log inspection:', e);
      alert('Local storage error. Check device space.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sheet-overlay open" onClick={onClose}>
      <div className="sheet-panel" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
        <div className="sheet-handle" />
        
        <div className="sheet-header">
          <p className="sheet-title">Log Inspection</p>
          <p className="sheet-sub">{hiveName}</p>
          <button className="sheet-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="sheet-body" style={{ paddingTop: 10 }}>
          {/* Operational Status Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Colony Health</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['good', 'fair', 'poor'] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setHealth(h)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      border: '1px solid',
                      borderColor: health === h ? (h === 'good' ? '#86EFAC' : h === 'fair' ? '#FDE68A' : '#FECACA') : '#E2E8F0',
                      background: health === h ? (h === 'good' ? '#F0FDF4' : h === 'fair' ? '#FFFBEB' : '#FEF2F2') : '#fff',
                      color: health === h ? (h === 'good' ? '#15803D' : h === 'fair' ? '#B45309' : '#B91C1C') : '#64748B'
                    }}
                  >
                    {h.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Queen State</label>
              <select 
                value={queen} 
                onChange={e => setQueen(e.target.value as any)}
                className="form-select-native"
                style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
              >
                <option value="healthy">Healthy</option>
                <option value="missing">Missing</option>
                <option value="replaced">Replaced</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Box Count</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input 
                type="range" min="1" max="10" 
                value={boxes} 
                onChange={e => setBoxes(parseInt(e.target.value))} 
                style={{ flex: 1, accentColor: 'var(--c-primary)' }} 
              />
              <span style={{ fontSize: 16, fontWeight: 900, minWidth: 20 }}>{boxes}</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Field Notes</label>
            <textarea
              placeholder="Observation notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14, resize: 'none' }}
            />
          </div>

          <button 
            disabled={submitting || success}
            onClick={handleSubmit}
            style={{ 
              width: '100%', padding: '16px', borderRadius: 14, 
              background: success ? '#15803D' : 'var(--c-primary)', 
              color: 'white', border: 'none', fontSize: 16, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? <RefreshCw size={20} className="animate-spin" /> : 
             success ? <CheckCircle2 size={20} /> : 'Save Inspection'}
          </button>

          {!isOnline && (
            <p style={{ textAlign: 'center', fontSize: 10, color: '#94A3B8', marginTop: 12, fontWeight: 600 }}>
              Device is OFFLINE. Action will be queued and synced later.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
