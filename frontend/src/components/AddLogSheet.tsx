import React, { useState } from 'react';
import { apiPost } from '../services/api';

interface Props {
  isOpen: boolean;
  hiveId: string;
  hiveName: string;
  onClose: () => void;
  onAdded: () => void;
}

export const AddLogSheet: React.FC<Props> = ({ isOpen, hiveId, hiveName, onClose, onAdded }) => {
  const [notes, setNotes]       = useState('');
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 16));
  const [queenStatus, setQueen] = useState('healthy');
  const [health, setHealth]     = useState('good');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setNotes('');
    setDate(new Date().toISOString().slice(0, 16));
    setQueen('healthy');
    setHealth('good');
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!notes.trim()) { setError('Notes are required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/inspections', {
        uid: hiveId,       // controller appends real uid from JWT
        hive_id: hiveId,
        date: new Date(date).toISOString(),
        notes: notes.trim(),
        queen_status: queenStatus,
        health_status: health,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      reset();
      onAdded();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save log. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sheet-overlay open" onClick={handleClose}>
      <div className="sheet-panel" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="sheet-header">
          <p className="sheet-title">Add Log</p>
          <p className="sheet-sub">{hiveName}</p>
          <p style={{ fontSize: 13, color: '#555', marginTop: 8 }}>Record hive conditions and observations to monitor performance.</p>
          <button className="sheet-close" onClick={handleClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="sheet-body">
          {/* Date/time */}
          <p style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',color:'#aaa',marginBottom:6 }}>Date &amp; Time</p>
          <input
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #E2E8F0',fontSize:13,marginBottom:16,boxSizing:'border-box' }}
          />

          {/* Notes */}
          <p style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',color:'#aaa',marginBottom:6 }}>Notes <span style={{color:'#B91C1C'}}>*</span></p>
          <textarea
            placeholder="Describe your observation..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #E2E8F0',fontSize:13,resize:'vertical',marginBottom:16,boxSizing:'border-box' }}
          />

          {/* Queen status */}
          <p style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',color:'#aaa',marginBottom:6 }}>Queen Status</p>
          <select
            value={queenStatus}
            onChange={e => setQueen(e.target.value)}
            style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #E2E8F0',fontSize:13,marginBottom:16,boxSizing:'border-box',background:'#fff' }}
          >
            <option value="healthy">Healthy</option>
            <option value="missing">Missing</option>
            <option value="replaced">Replaced</option>
          </select>

          {/* Health */}
          <p style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',color:'#aaa',marginBottom:6 }}>Hive Health</p>
          <select
            value={health}
            onChange={e => setHealth(e.target.value)}
            style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #E2E8F0',fontSize:13,marginBottom:20,boxSizing:'border-box',background:'#fff' }}
          >
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>

          {error && (
            <p style={{ color:'#B91C1C',fontSize:12,marginBottom:12,fontWeight:600 }}>{error}</p>
          )}

          <button
            className="btn btn-primary btn-full"
            style={{ borderRadius:14,padding:'14px',fontSize:15 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Log'}
          </button>
          {success && <div>Saved successfully</div>}
        </div>
      </div>
    </div>
  );
};
