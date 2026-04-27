import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { apiGet } from '../services/api';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'success' | 'info';
  title: string;
  desc: string;
  source: string;
  unread?: boolean;
}

const CFG = {
  critical: { Icon: AlertCircle,  bg: '#FEE2E2', color: '#B91C1C' },
  warning:  { Icon: AlertTriangle, bg: '#FEF3C7', color: '#B45309' },
  success:  { Icon: CheckCircle2, bg: '#DCFCE7', color: '#15803D' },
  info:     { Icon: Info,         bg: '#DBEAFE', color: '#1D4ED8' },
};

export const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiGet('/api/alerts')
      .then(d => setAlerts(Array.isArray(d) ? d : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (error) return (
    <div className="page-enter">
      <div className="page-header" style={{ alignItems:'center' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <Bell size={22} color="#8B0000" strokeWidth={2.5} />
          <div>
            <p className="page-title">Alerts</p>
            <p className="page-subtitle">System notifications & action items</p>
          </div>
        </div>
      </div>
      <div className="error-state">
        <div className="error-icon"><AlertCircle size={22} /></div>
        <p className="error-title">Could not load alerts</p>
        <p className="error-body">Check your connection and try again.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="page-enter">
      <div className="page-header" style={{ alignItems:'center' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <Bell size={22} color="#8B0000" strokeWidth={2.5} />
          <div>
            <p className="page-title">Alerts</p>
            <p className="page-subtitle">System notifications & action items</p>
          </div>
        </div>
        {!loading && <span className="badge badge-red">{alerts.filter(a=>a.unread).length} new</span>}
      </div>

      <div className="card">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="alert-card">
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skeleton" style={{ height: 13, width: '70%' }} />
                <div className="skeleton" style={{ height: 11, width: '90%' }} />
              </div>
            </div>
          ))
        ) : alerts.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
             <p style={{ color: '#666' }}>No new alerts</p>
          </div>
        ) : (
          alerts.map(a => {
            const { Icon, bg, color } = CFG[a.type] || CFG.info;
            return (
              <div key={a.id} className="alert-card">
                <div className="alert-icon" style={{ background: bg }}>
                  <Icon size={18} color={color} />
                </div>
                <div className="alert-content">
                  <p className="alert-title">{a.title}</p>
                  <p className="alert-desc">{a.desc}</p>
                  <p className="alert-meta">{a.source}</p>
                </div>
                {a.unread && <div className="alert-dot" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
