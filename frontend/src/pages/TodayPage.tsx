import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Hexagon, Clock, CheckCircle2, AlertTriangle, AlertCircle, Plus } from 'lucide-react';
import { apiGet } from '../services/api';

/* ── helpers ── */
const initials = (name?: string) =>
  name ? name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'BK';

/* ── sub-components ── */
const StatCard = ({ label, value, primary, Icon, loading }: any) => (
  <div className={`stat-card${primary ? ' primary' : ''}`}>
    <div className="stat-card-icon">
      <Icon size={18} color={primary ? '#fff' : '#8B0000'} />
    </div>
    {loading
      ? <div className="skeleton" style={{ height: 40, width: 56, marginBottom: 6, borderRadius: 8 }} />
      : <div className="stat-card-value">{value}</div>
    }
    <div className="stat-card-label">{label}</div>
  </div>
);

const HealthRow = ({ icon, label, count, loading }: any) => (
  <div className="row-item">
    <div className="row-icon" style={{ background: icon.bg }}>
      {icon.el}
    </div>
    <span className="row-title">{label}</span>
    {loading
      ? <div className="skeleton" style={{ width: 28, height: 24 }} />
      : <span className="row-value">{count}</span>
    }
  </div>
);

/* ── page ── */
export const TodayPage = ({ user }: any) => {
  const [hives, setHives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiGet('/api/hives')
      .then(d => { setHives(Array.isArray(d) ? d : []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total:    hives.length,
    healthy:  hives.filter(h => h.healthStatus === 'healthy').length,
    warning:  hives.filter(h => h.healthStatus === 'warning').length,
    critical: hives.filter(h => h.healthStatus === 'critical').length,
  }), [hives]);

  /* error */
  if (error) return (
    <div className="page-enter">
      <div className="page-header"><div><p className="page-title">Today</p></div></div>
      <div className="error-state">
        <div className="error-icon"><AlertCircle size={22} /></div>
        <p className="error-title">Could not load hive data</p>
        <p className="error-body">Check your connection and try again.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  /* main */
  return (
    <div className="page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="page-title">Today</p>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:'#22c55e' }} />
            <span style={{ fontSize:12,fontWeight:600,color:'#888' }}>Cloud connected</span>
          </div>
        </div>
        <div style={{ width:38,height:38,borderRadius:'50%',background:'#8B0000',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0 }}>
          {initials(user?.displayName)}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <StatCard label="TOTAL HIVES" value={stats.total} primary Icon={Hexagon} loading={loading} />
        <StatCard label="DUE CHECKS"  value={stats.warning} Icon={Clock} loading={loading} />
      </div>

      {/* Health overview */}
      <p className="section-label">Health Overview</p>
      <div className="card" style={{ marginBottom: 20 }}>
        <HealthRow
          label="Healthy & Thriving"
          count={stats.healthy}
          loading={loading}
          icon={{ el: <CheckCircle2 size={18} color="#15803D" />, bg: '#DCFCE7' }}
        />
        <HealthRow
          label="Needs Attention"
          count={stats.warning}
          loading={loading}
          icon={{ el: <AlertTriangle size={18} color="#B45309" />, bg: '#FEF3C7' }}
        />
        <HealthRow
          label="Critical"
          count={stats.critical}
          loading={loading}
          icon={{ el: <AlertCircle size={18} color="#B91C1C" />, bg: '#FEE2E2' }}
        />
      </div>

      {/* Recent activity */}
      <p className="section-label">Recent Activity</p>
      <div className="card">
        {loading ? (
          [1,2].map(i => (
            <div key={i} className="row-item">
              <div className="skeleton" style={{ width:36,height:36,borderRadius:'50%',flexShrink:0 }} />
              <div style={{ flex:1, display:'flex',flexDirection:'column',gap:6 }}>
                <div className="skeleton" style={{ height:13,width:'70%' }} />
                <div className="skeleton" style={{ height:11,width:'50%' }} />
              </div>
            </div>
          ))
        ) : hives.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#666' }}>
            <Hexagon size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <p>No activity yet.</p>
            <Link to="/hives" style={{ display: 'inline-block', marginTop: '10px', fontSize: 13, color: '#8B0000', fontWeight: 600 }}>Add your first hive</Link>
          </div>
        ) : hives.slice(0,4).map((h, i) => {
          const healthy = h.healthStatus === 'healthy';
          return (
            <div key={h._id||h.id||i} className="row-item">
              <div className="row-icon" style={{ background: healthy ? '#DCFCE7' : '#FEF3C7' }}>
                <div style={{ width:7,height:7,borderRadius:'50%',background: healthy ? '#22c55e' : '#f59e0b' }} />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13,fontWeight:700,lineHeight:1.35 }}>
                  {h.name} — {healthy ? 'Inspection completed' : 'Check overdue'}
                </p>
                <p style={{ fontSize:11,color:'#999',marginTop:2 }}>
                  {h.location?.city || 'Tamil Nadu'} · {healthy ? '2h ago' : 'Today'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
